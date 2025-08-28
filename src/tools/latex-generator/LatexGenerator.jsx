import React, { useState, useEffect, useRef } from 'react';
import ToolHeader from '../../components/ToolHeader';
import UI from '../../core/UI';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import './latexGenerator.css';

const symbolLibrary = {
  'Greek Letters': {
    'alpha': '\\alpha', 'beta': '\\beta', 'gamma': '\\gamma', 'delta': '\\delta', 'epsilon': '\\epsilon',
    'zeta': '\\zeta', 'eta': '\\eta', 'theta': '\\theta', 'iota': '\\iota', 'kappa': '\\kappa',
    'lambda': '\\lambda', 'mu': '\\mu', 'nu': '\\nu', 'xi': '\\xi', 'omicron': 'o',
    'pi': '\\pi', 'rho': '\\rho', 'sigma': '\\sigma', 'tau': '\\tau', 'upsilon': '\\upsilon',
    'phi': '\\phi', 'chi': '\\chi', 'psi': '\\psi', 'omega': '\\omega',
    'Gamma': '\\Gamma', 'Delta': '\\Delta', 'Theta': '\\Theta', 'Lambda': '\\Lambda', 'Xi': '\\Xi',
    'Pi': '\\Pi', 'Sigma': '\\Sigma', 'Upsilon': '\\Upsilon', 'Phi': '\\Phi', 'Psi': '\\Psi', 'Omega': '\\Omega',
  },
  'Operators': {
    'plus': '+', 'minus': '-', 'times': '\\times', 'div': '\\div', 'cdot': '\\cdot',
    'pm': '\\pm', 'mp': '\\mp', 'ast': '\\ast', 'star': '\\star', 'circ': '\\circ',
    'bullet': '\\bullet', 'sum': '\\sum', 'prod': '\\prod', 'int': '\\int', 'oint': '\\oint',
    'partial': '\\partial', 'nabla': '\\nabla', 'sqrt': '\\sqrt{}', 'frac': '\\frac{}{}','^': '^', '_': '_',
  },
  'Relations': {
    '=': '=', '<': '<', '>': '>', 'leq': '\\leq', 'geq': '\\geq', 'neq': '\\neq',
    'approx': '\\approx', 'equiv': '\\equiv', 'propto': '\\propto', 'in': '\\in', 'ni': '\\ni',
    'subset': '\\subset', 'supset': '\\supset', 'subseteq': '\\subseteq', 'supseteq': '\\supseteq',
  },
  'Arrows': {
    'leftarrow': '\\leftarrow', 'rightarrow': '\\rightarrow', 'uparrow': '\\uparrow', 'downarrow': '\\downarrow',
    'leftrightarrow': '\\leftrightarrow', 'updownarrow': '\\updownarrow',
    'Leftarrow': '\\Leftarrow', 'Rightarrow': '\\Rightarrow', 'Uparrow': '\\Uparrow', 'Downarrow': '\\Downarrow',
    'Leftrightarrow': '\\Leftrightarrow', 'Updownarrow': '\\Updownarrow',
  },
};



export default function LatexGenerator() {
  const [latex, setLatex] = useState('E = mc^2');
  const [activeCategory, setActiveCategory] = useState('Greek Letters');
  const previewRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (previewRef.current) {
      try {
        katex.render(latex, previewRef.current, {
          throwOnError: false,
          displayMode: true,
        });
      } catch (error) {
        // Error is handled by throwOnError: false, but we can log it.
        console.error(error);
      }
    }
  }, [latex]);

  const handleSymbolClick = (symbol) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newLatex = latex.substring(0, start) + symbol + latex.substring(end);
    
    setLatex(newLatex);

    // Focus and set cursor position after the inserted symbol
    setTimeout(() => {
      textarea.focus();
      const newPos = start + symbol.length;
      // Move cursor inside brackets if present
      if (symbol.includes('{}')) {
         textarea.setSelectionRange(newPos - 1, newPos - 1);
      } else {
         textarea.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(latex);
    UI.toast('LaTeX copied to clipboard!', { type: 'success' });
  };

  return (
    <div className="tool latex-generator">
      <ToolHeader title="LaTeX Math Generator" subtitle="Click symbols to build your LaTeX expression" />
      <div className="latex-generator-layout">
        <div className="tool-section symbol-picker">
          <div className="section-header">
            <div className="symbol-categories">
              {Object.keys(symbolLibrary).map(category => (
                <button
                  key={category}
                  className={`chip ${activeCategory === category ? 'active' : ''}`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          <div className="section-body">
            <div className="symbol-grid">
              {symbolLibrary[activeCategory] && Object.entries(symbolLibrary[activeCategory]).map(([name, symbol]) => (
                <button key={name} className="btn symbol-btn" title={name} onClick={() => handleSymbolClick(symbol)}>
                  <span dangerouslySetInnerHTML={{ __html: katex.renderToString(symbol, { throwOnError: false }) }} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="tool-section latex-editor">
           <div className="section-header">Editor & Preview</div>
           <div className="section-body">
            <textarea
              ref={textareaRef}
              className="input"
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder="Enter LaTeX here..."
              rows="5"
            />
            <div className="preview-area" ref={previewRef} />
            <button className="btn primary" onClick={handleCopy}>Copy LaTeX</button>
           </div>
        </div>
      </div>
    </div>
  );
}