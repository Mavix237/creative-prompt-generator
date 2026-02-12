
import React, { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { RefreshCcw, ChevronDown, Sparkles, Loader2, Copy, Check } from 'lucide-react';
import OpenAI from 'openai';

interface AnnotatedNotesProps {
  valueHtml: string;
  onChangeHtml: (html: string) => void;
  placeholder?: string;
}

const AnnotatedNotes: React.FC<AnnotatedNotesProps> = memo(({ valueHtml, onChangeHtml, placeholder = 'type freely…' }) => {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [hasSelection, setHasSelection] = React.useState(false);

  // Keep DOM in sync with stored HTML (without fighting user typing)
  React.useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const current = el.innerHTML;
    if (current !== valueHtml) el.innerHTML = valueHtml;
  }, [valueHtml]);

  const save = React.useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    onChangeHtml(el.innerHTML);
  }, [onChangeHtml]);

  const updateSelectionState = React.useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setHasSelection(false);
      return;
    }
    const range = sel.getRangeAt(0);
    const el = editorRef.current;
    if (!el) {
      setHasSelection(false);
      return;
    }
    const within = el.contains(range.commonAncestorContainer);
    setHasSelection(within && !range.collapsed);
  }, []);

  const toggleHighlightSelection = React.useCallback(() => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    if (!el.contains(range.commonAncestorContainer)) return;

    // If selection intersects existing highlights, remove them (toggle off)
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node) => {
        if (node instanceof HTMLElement && node.classList.contains('annotation-marker')) return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_SKIP;
      },
    });

    const intersecting: HTMLElement[] = [];
    let n = walker.nextNode();
    while (n) {
      const node = n as HTMLElement;
      // `intersectsNode` is supported in modern browsers; guard just in case.
      const intersects =
        typeof (range as any).intersectsNode === 'function'
          ? (range as any).intersectsNode(node)
          : node.contains(range.startContainer) || node.contains(range.endContainer);
      if (intersects) intersecting.push(node);
      n = walker.nextNode();
    }

    if (intersecting.length > 0) {
      // Unwrap marker spans
      intersecting.forEach((marker) => {
        const parent = marker.parentNode;
        if (!parent) return;
        while (marker.firstChild) parent.insertBefore(marker.firstChild, marker);
        parent.removeChild(marker);
        (parent as HTMLElement).normalize?.();
      });
    } else {
      const span = document.createElement('span');
      span.className = 'annotation-marker';

      // Prefer surroundContents, fall back to extract/insert for complex selections
      try {
        range.surroundContents(span);
      } catch {
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
      }
    }

    // Collapse selection and persist
    sel.removeAllRanges();
    save();
    setHasSelection(false);
  }, [save]);

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Cmd/Ctrl + H to highlight selection
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        toggleHighlightSelection();
      }
    },
    [toggleHighlightSelection]
  );

  return (
    <div className="w-full">
      <div className="flex items-center justify-between w-full mb-3">
        <span className="font-mono-label text-[#5b6b7a] text-[10px] opacity-60 uppercase tracking-[0.4em]">
          notes
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleHighlightSelection}
            disabled={!hasSelection}
            className="glass-button px-3 py-1.5 font-mono-label text-[10px] tracking-[0.25em] text-[#5b6b7a] uppercase disabled:opacity-40"
            title="Toggle highlight (Cmd/Ctrl+H)"
          >
            highlight
          </button>
          <span className="font-mono-label text-[#5b6b7a] text-[9px] opacity-30 uppercase tracking-[0.3em]">
            saved locally
          </span>
        </div>
      </div>

      <div
        ref={editorRef}
        className="glass-button notes-editor w-full min-h-[60vh] lg:min-h-[72vh] p-6 font-serif-notes text-[16px] md:text-[18px] leading-relaxed text-[#3d4b58] focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all duration-200 resize-none rounded-sm"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onInput={save}
        onKeyUp={updateSelectionState}
        onMouseUp={updateSelectionState}
        onKeyDown={onKeyDown}
        spellCheck={false}
      />
    </div>
  );
});

// Large pool of common, recognizable words (nouns, verbs, adjectives, etc.)
const WORD_POOL = [
  'apple', 'ocean', 'mountain', 'river', 'forest', 'desert', 'cloud', 'star', 'moon', 'sun', 'wind', 'rain', 'snow', 'fire', 'water', 'earth', 'stone', 'crystal', 'metal', 'wood',
  'bird', 'fish', 'tree', 'flower', 'leaf', 'root', 'branch', 'seed', 'fruit', 'grain', 'grass', 'moss', 'vine', 'thorn', 'petal',
  'wave', 'echo', 'silence', 'shadow', 'light', 'dark', 'bright', 'dim', 'glow', 'spark', 'flash', 'beam', 'ray', 'shade', 'hue',
  'voice', 'sound', 'music', 'rhythm', 'beat', 'tone', 'pitch', 'melody', 'harmony', 'chord', 'note', 'song', 'verse', 'chorus',
  'touch', 'feel', 'texture', 'surface', 'smooth', 'rough', 'soft', 'hard', 'warm', 'cold', 'hot', 'cool', 'wet', 'dry', 'moist',
  'pulse', 'heart', 'breath', 'life', 'energy', 'force', 'power', 'strength', 'weakness', 'vigor', 'vitality', 'spirit', 'soul',
  'vision', 'sight', 'view', 'gaze', 'glance', 'stare', 'look', 'see', 'watch', 'observe', 'notice', 'perceive', 'detect',
  'weight', 'mass', 'density', 'gravity', 'balance', 'scale', 'measure', 'size', 'length', 'width', 'height', 'depth', 'breadth',
  'motion', 'movement', 'flow', 'drift', 'glide', 'slide', 'shift', 'turn', 'spin', 'rotate', 'swing', 'sway', 'bounce', 'jump',
  'heat', 'warmth', 'temperature', 'fever', 'burn', 'melt', 'freeze', 'ice', 'frost', 'chill', 'breeze', 'gust', 'blast', 'gale',
  'frequency', 'wave', 'vibration', 'oscillation', 'resonance', 'echo', 'reverberation', 'amplitude', 'wavelength', 'spectrum',
  'time', 'moment', 'instant', 'second', 'minute', 'hour', 'day', 'night', 'dawn', 'dusk', 'twilight', 'midnight', 'noon',
  'space', 'distance', 'gap', 'void', 'emptiness', 'fullness', 'volume', 'capacity', 'room', 'area', 'zone', 'region', 'territory',
  'color', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'silver', 'gold',
  'shape', 'circle', 'square', 'triangle', 'line', 'curve', 'angle', 'corner', 'edge', 'point', 'tip', 'end', 'beginning',
  'pattern', 'design', 'form', 'structure', 'frame', 'outline', 'border', 'boundary', 'limit', 'edge', 'margin', 'rim', 'brim',
  'memory', 'thought', 'idea', 'concept', 'notion', 'belief', 'opinion', 'view', 'perspective', 'angle', 'aspect', 'facet',
  'emotion', 'feeling', 'mood', 'tone', 'atmosphere', 'ambiance', 'aura', 'vibe', 'energy', 'spirit', 'essence', 'nature',
  'dream', 'fantasy', 'reality', 'truth', 'lie', 'fact', 'fiction', 'story', 'tale', 'narrative', 'plot', 'theme', 'motif',
  'journey', 'path', 'road', 'trail', 'track', 'route', 'way', 'direction', 'course', 'direction', 'heading', 'bearing',
  'door', 'window', 'opening', 'entrance', 'exit', 'gate', 'portal', 'threshold', 'passage', 'corridor', 'hallway', 'tunnel',
  'bridge', 'connection', 'link', 'bond', 'tie', 'relationship', 'association', 'union', 'merger', 'fusion', 'blend', 'mix'
];

// Constraints pool - technical/artistic terms
const CONSTRAINT_POOL = [
  'monochrome', 'grayscale', 'sepia', 'black and white', 'full color', 'pastel', 'neon', 'muted', 'vibrant', 'saturated', 'desaturated',
  '2.5-D', '3D', 'flat', 'dimensional', 'layered', 'stacked', 'overlapping', 'interlaced', 'interwoven', 'nested',
  '30 seconds', '1 minute', '5 minutes', 'real-time', 'slow motion', 'time-lapse', 'frozen', 'static', 'dynamic', 'animated',
  'handheld', 'tripod', 'steady', 'shaky', 'blurred', 'sharp', 'focused', 'unfocused', 'depth of field', 'bokeh',
  'pixelated', 'low-res', 'high-res', '4K', '8K', 'retro', 'vintage', 'modern', 'futuristic', 'classic', 'contemporary',
  'vertical', 'horizontal', 'diagonal', 'angled', 'tilted', 'rotated', 'inverted', 'flipped', 'mirrored', 'reflected',
  'grainy', 'smooth', 'textured', 'rough', 'polished', 'matte', 'glossy', 'shiny', 'dull', 'lustrous',
  '8-bit', '16-bit', 'vector', 'raster', 'bitmap', 'svg', 'png', 'jpg', 'gif', 'webp',
  'glitch', 'distorted', 'warped', 'bent', 'curved', 'straight', 'linear', 'non-linear', 'organic', 'geometric',
  'negative space', 'positive space', 'filled', 'empty', 'sparse', 'dense', 'crowded', 'minimal', 'maximal', 'balanced',
  'macro', 'micro', 'close-up', 'wide-angle', 'telephoto', 'fisheye', 'panoramic', 'zoomed', 'cropped', 'full-frame',
  'transparent', 'opaque', 'translucent', 'solid', 'hollow', 'porous', 'impermeable', 'permeable', 'breathable', 'sealed',
  'minimalist', 'maximalist', 'simple', 'complex', 'intricate', 'elaborate', 'ornate', 'plain', 'bare', 'stripped'
];

// Function to get a random word from the pool
const getRandomWord = (): string => {
  return WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)];
};

// Function to get a random constraint
const getRandomConstraint = (): string => {
  return CONSTRAINT_POOL[Math.floor(Math.random() * CONSTRAINT_POOL.length)];
};

interface PromptSlotProps {
  label: string;
  value: string;
  onShuffle: () => void;
  onChange: (newValue: string) => void;
}

interface AIActionSectionProps {
  generateAIPrompt: () => void;
  isGenerating: boolean;
  aiPrompt: string | null;
  copyToClipboard: () => void;
  copied: boolean;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

const AIActionSection: React.FC<AIActionSectionProps> = memo(({ 
  generateAIPrompt, 
  isGenerating, 
  aiPrompt, 
  copyToClipboard, 
  copied,
  apiKey,
  onApiKeyChange
}) => {
  const [mousePosition, setMousePosition] = React.useState<{ x: number; y: number } | null>(null);
  const [isClicked, setIsClicked] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const squareSize = 40;
      const halfSize = squareSize / 2;
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      
      // Constrain square within button bounds
      x = Math.max(halfSize, Math.min(x, rect.width - halfSize));
      y = Math.max(halfSize, Math.min(y, rect.height - halfSize));
      
      setMousePosition({ x, y });
    }
  };

  const handleMouseLeave = () => {
    setMousePosition(null);
    setIsClicked(false);
  };

  const handleClick = async () => {
    setIsClicked(true);
    await copyToClipboard();
  };

  return (
    <div className="w-full max-w-3xl px-6 pt-12 pb-32 flex flex-col items-center space-y-12">
      <div className="w-16 h-[1px] bg-[#5b6b7a] opacity-20 transition-all duration-200 ease-out hover:w-24 hover:opacity-40" />

      {/* API Key Input */}
      <div className="w-full max-w-md flex flex-col items-center space-y-3">
        <label className="font-mono-label text-[10px] uppercase tracking-[0.3em] text-[#5b6b7a] opacity-60">
          OpenAI API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="sk-..."
          className="w-full px-4 py-2.5 font-mono-label text-xs bg-white/20 backdrop-blur-sm border border-white/30 rounded text-[#3d4b58] placeholder:text-[#5b6b7a] placeholder:opacity-40 focus:outline-none focus:border-white/50 focus:bg-white/30 transition-all duration-200"
        />
        <p className="text-[9px] text-[#5b6b7a] opacity-40 text-center max-w-sm">
          Your API key is stored locally and never sent to our servers. Get your key at{' '}
          <a 
            href="https://platform.openai.com/api-keys" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:opacity-60 transition-opacity"
          >
            platform.openai.com
          </a>
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <button
          onClick={generateAIPrompt}
          disabled={isGenerating || !apiKey.trim()}
          className="relative flex items-center justify-center px-12 py-5 font-mono-label text-sm tracking-[0.3em] transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 overflow-hidden group glass-generate-button"
        >
          <span className="absolute inset-0 bg-[#3d4b58]/80 backdrop-blur-xl border border-white/20 transition-all duration-200 group-hover:bg-[#3d4b58]/90 group-hover:border-white/30"></span>
          <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
          <span className="relative z-10 text-white font-medium transition-all duration-150 group-hover:tracking-[0.4em]">
            {isGenerating ? 'GENERATING...' : 'GENERATE PROMPT'}
          </span>
        </button>
      </div>

      {/* AI Result Area */}
      <div className={`transition-all duration-300 ease-out w-full text-center ${aiPrompt ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95 pointer-events-none'}`}>
        <div className="glass-header p-8 md:p-12 border-white/20 backdrop-blur-md transition-all duration-200 ease-out hover:bg-white/40 hover:shadow-xl hover:scale-[1.02]">
          <span className="font-mono-label text-[10px] uppercase tracking-[0.5em] opacity-40 mb-6 block transition-all duration-150 hover:opacity-60 hover:tracking-[0.6em]">AI Creative Direction</span>
          <p className="font-ai-prompt text-l md:text-2xl text-[#3d4b58] leading-normal transition-all duration-200 ease-out hover:opacity-90 mb-6">
            {aiPrompt}
          </p>
          <button
            ref={buttonRef}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="glass-button relative flex items-center space-x-2 px-6 py-2.5 text-[#5b6b7a] text-[11px] font-mono-label group shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-150 ease-out overflow-hidden mx-auto"
          >
            {(mousePosition || isClicked) && (
              <div
                className="absolute pointer-events-none bg-white/30"
                style={{
                  width: isClicked ? '100%' : '40px',
                  height: isClicked ? '100%' : '40px',
                  left: isClicked ? '0' : `${mousePosition ? mousePosition.x - 20 : 0}px`,
                  top: isClicked ? '0' : `${mousePosition ? mousePosition.y - 20 : 0}px`,
                  transition: isClicked ? 'width 0s, height 0s, left 0s, top 0s' : 'left 0.1s ease-out, top 0.1s ease-out',
                }}
              />
            )}
            {copied ? (
              <>
                <Check size={14} className="relative z-10 transition-transform duration-150" />
                <span className="relative z-10 tracking-[0.2em]">COPIED</span>
              </>
            ) : (
              <>
                <Copy size={14} className="relative z-10 transition-transform duration-150 group-hover:scale-110" />
                <span className="relative z-10 tracking-[0.2em]">COPY</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

const PromptSlot: React.FC<PromptSlotProps> = memo(({ label, value, onShuffle, onChange }) => {
  const [isChanging, setIsChanging] = React.useState(false);
  const [displayValue, setDisplayValue] = React.useState(value);
  const [isEditing, setIsEditing] = React.useState(false);
  const [mousePosition, setMousePosition] = React.useState<{ x: number; y: number } | null>(null);
  const [isClicked, setIsClicked] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (value !== displayValue) {
      if (isEditing) {
        // If user is editing, update immediately without animation
        setDisplayValue(value);
      } else {
        // If not editing, show animation
        setIsChanging(true);
        const timer = setTimeout(() => {
          setDisplayValue(value);
          setIsChanging(false);
        }, 100);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    onChange(newValue);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
  };

  const handleInputFocus = () => {
    setIsEditing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const squareSize = 40;
      const halfSize = squareSize / 2;
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      
      // Constrain square within button bounds
      x = Math.max(halfSize, Math.min(x, rect.width - halfSize));
      y = Math.max(halfSize, Math.min(y, rect.height - halfSize));
      
      setMousePosition({ x, y });
    }
  };

  const handleMouseLeave = () => {
    setMousePosition(null);
    setIsClicked(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsClicked(true);
    onShuffle();
  };

  return (
    <section className="min-h-[50vh] w-full flex flex-col items-center justify-center px-6 md:px-12 relative py-8">
      <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-2xl z-10">
        <div className="flex flex-col items-center w-full">
          <span className="font-mono-label text-[#5b6b7a] text-[12px] opacity-60 mb-3 uppercase tracking-[0.4em] transition-opacity duration-150 hover:opacity-80">{label}</span>
          
          <div className="relative w-full py-6 md:py-10 flex items-center justify-center text-center">
            <div className="absolute inset-0 bg-white/5 blur-[80px] rounded-full scale-75 pointer-events-none transition-all duration-200 ease-out"></div>
            
            <div className="relative w-full flex flex-col items-center">
              <input
                type="text"
                value={displayValue}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="enter concept"
                className={`font-serif-prompt text-3xl md:text-5xl text-[#3d4b58] font-light tracking-tight leading-tight transition-all duration-200 ease-in-out lowercase bg-transparent border-none outline-none text-center w-full underline decoration-[#5b6b7a] decoration-opacity-30 focus:decoration-opacity-60 focus:outline-none placeholder:text-[#3d4b58] placeholder:opacity-30 ${
                  isChanging ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100'
                }`}
                style={{ textUnderlineOffset: '0.2em', textDecorationThickness: '0.5px' }}
              />
            </div>
          </div>
        </div>

        <button 
          ref={buttonRef}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="glass-button relative flex items-center space-x-3 px-8 py-3 text-[#5b6b7a] text-[12px] font-mono-label group shadow-sm hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-150 ease-out overflow-hidden"
        >
          {(mousePosition || isClicked) && (
            <div
              className="absolute pointer-events-none bg-white/30"
              style={{
                width: isClicked ? '100%' : '40px',
                height: isClicked ? '100%' : '40px',
                left: isClicked ? '0' : `${mousePosition ? mousePosition.x - 20 : 0}px`,
                top: isClicked ? '0' : `${mousePosition ? mousePosition.y - 20 : 0}px`,
                transition: isClicked ? 'width 0s, height 0s, left 0s, top 0s' : 'left 0.1s ease-out, top 0.1s ease-out',
              }}
            />
          )}
          <RefreshCcw size={14} className="relative z-10 group-hover:rotate-90 group-active:rotate-180 transition-transform duration-200 ease-in-out" />
          <span className="relative z-10 tracking-[0.2em] transition-all duration-150 group-hover:tracking-[0.3em]">SHUFFLE</span>
        </button>
      </div>
    </section>
  );
});

const App: React.FC = () => {
  const [word1, setWord1] = useState(getRandomWord());
  const [word2, setWord2] = useState(getRandomWord());
  const [constraint, setConstraint] = useState(getRandomConstraint());
  
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Load API key from localStorage on mount
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('openai_api_key') || '';
    }
    return '';
  });

  // Save API key to localStorage when it changes
  const handleApiKeyChange = useCallback((key: string) => {
    setApiKey(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('openai_api_key', key);
    }
  }, []);

  // Notes panel state (HTML, stored locally)
  const [notesHtml, setNotesHtml] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('notes_html') || '';
    }
    return '';
  });

  const handleNotesHtmlChange = useCallback((val: string) => {
    setNotesHtml(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('notes_html', val);
    }
  }, []);

  const shuffle = useCallback((isConstraint: boolean, current: string, setter: (val: string) => void) => {
    let next;
    do {
      next = isConstraint ? getRandomConstraint() : getRandomWord();
    } while (next === current);
    setter(next);
    setAiPrompt(null); // Reset AI prompt when ingredients change
  }, []);

  const generateAIPrompt = useCallback(async () => {
    if (!apiKey || apiKey.trim() === '') {
      setAiPrompt("Please enter your OpenAI API key to generate prompts.");
      return;
    }

    setIsGenerating(true);
    try {
      const openai = new OpenAI({ 
        apiKey: apiKey.trim(),
        dangerouslyAllowBrowser: true,
        timeout: 10000, // 10 second timeout
      });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Combine these three elements into a single, high-concept, one-sentence creative prompt for an artist or designer: "${word1}", "${word2}", and the limitation "${constraint}". Do not include the words in quotes, just the sentence. Keep it concise and to the point.`
        }],
        temperature: 0.8,
        max_tokens: 80, // Reduced from 100 for faster response
      });
      setAiPrompt(response.choices[0]?.message?.content?.trim() || "Failed to generate prompt.");
    } catch (error) {
      console.error("AI Generation Error:", error);
      if (error instanceof Error && error.message.includes('api key')) {
        setAiPrompt("Invalid API key. Please check your OpenAI API key and try again.");
      } else {
        setAiPrompt("The stars didn't align for this prompt. Try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  }, [word1, word2, constraint, apiKey]);

  const copyToClipboard = useCallback(async () => {
    if (aiPrompt) {
      try {
        await navigator.clipboard.writeText(aiPrompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  }, [aiPrompt]);

  // Memoized shuffle callbacks
  const shuffleWord1 = useCallback(() => shuffle(false, word1, setWord1), [word1, shuffle]);
  const shuffleWord2 = useCallback(() => shuffle(false, word2, setWord2), [word2, shuffle]);
  const shuffleConstraint = useCallback(() => shuffle(true, constraint, setConstraint), [constraint, shuffle]);

  return (
    <div className="relative min-h-screen w-full bg-waves flex flex-col items-center selection:bg-white/30">
      <div className="fixed inset-0 bg-overlay pointer-events-none z-0"></div>

      {/* Centered Logo */}
      <header className="sticky top-0 z-50 w-full pt-8 md:pt-10 mb-4">
        <div className="flex justify-center">
          <img 
            src={`${import.meta.env.BASE_URL || '/creative-prompt-generator/'}TMLogoB.png`}
            alt="TM Logo" 
            className="h-[35px] w-[74px] object-contain pt-0 pb-0"
          />
        </div>
      </header>

      {/* Main: 3-column layout (2 left, 1 right) */}
      <main className="relative z-10 w-full max-w-6xl px-6 md:px-10 pb-10 grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        {/* Left: existing stack spans 2 columns */}
        <section className="lg:col-span-2 flex flex-col items-center space-y-8">
          <PromptSlot
            label="element i"
            value={word1}
            onShuffle={shuffleWord1}
            onChange={setWord1}
          />

          <PromptSlot
            label="element ii"
            value={word2}
            onShuffle={shuffleWord2}
            onChange={setWord2}
          />

          <PromptSlot
            label="constraint"
            value={constraint}
            onShuffle={shuffleConstraint}
            onChange={setConstraint}
          />

          {/* AI Action Section */}
          <AIActionSection 
            generateAIPrompt={generateAIPrompt}
            isGenerating={isGenerating}
            aiPrompt={aiPrompt}
            copyToClipboard={copyToClipboard}
            copied={copied}
            apiKey={apiKey}
            onApiKeyChange={handleApiKeyChange}
          />
        </section>

        {/* Right: notes panel */}
        <aside className="lg:col-span-1 w-full lg:sticky lg:top-28">
          <div className="w-full flex flex-col items-center lg:items-stretch space-y-3">
            <AnnotatedNotes
              valueHtml={notesHtml}
              onChangeHtml={handleNotesHtmlChange}
              placeholder="type freely… select words → highlight"
            />
          </div>
        </aside>
      </main>

      {/* Persistent Footer */}
      <footer className="relative z-30 pb-12 w-full">
        <div className="flex flex-col items-center space-y-4 group cursor-default">
          <div className="w-12 h-[1px] bg-[#3d4b58] opacity-10 group-hover:w-24 group-hover:opacity-40 transition-all duration-300"></div>
          
          <span className="font-mono-label text-[9px] uppercase tracking-[1em] text-[#3d4b58] font-black opacity-30 group-hover:opacity-100 transition-all duration-300">TM Design Studios</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
