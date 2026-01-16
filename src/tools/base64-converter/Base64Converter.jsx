import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import ToolHeader from '../../components/ToolHeader';

const ImageToBase64 = () => {
  const [base64, setBase64] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles && rejectedFiles.length > 0) {
      setError('Invalid file type. Please upload a JPG, PNG, or GIF image.');
      return;
    }

    const file = acceptedFiles[0];
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
      setBase64(reader.result);
      setError('');
    };
    reader.onerror = () => {
      setError('Error reading file.');
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
    }
  });

  const handleClear = () => {
    setBase64('');
    setImage(null);
    setError('');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(base64);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div 
        {...getRootProps()} 
        className="dropzone"
        style={{
          border: '2px dashed var(--border)',
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center',
          cursor: 'pointer',
          borderColor: isDragActive ? 'var(--accent)' : 'var(--border)',
          backgroundColor: isDragActive ? 'color-mix(in oklab, var(--accent) 5%, transparent)' : 'var(--bg-elev)',
          transition: 'all 0.2s ease'
        }}
      >
        <input {...getInputProps()} />
        {image ? (
          <img 
            src={image} 
            alt="Preview" 
            className="image-preview" 
            style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
          />
        ) : (
          <div className="text-center">
            <p className="text-muted">Drag & drop an image here, or click to select</p>
          </div>
        )}
      </div>
      {error && <div className="badge error">{error}</div>}
      {base64 && (
        <div className="tool-pane flex-1">
          <div className="tool-pane-header">
            <span>Base64 Output</span>
            <div className="flex gap-2">
               <button className="btn small primary" onClick={handleCopy}>Copy</button>
               <button className="btn small" onClick={handleClear}>Clear</button>
            </div>
          </div>
          <div className="tool-pane-content p-0">
             <textarea className="textarea h-full border-0" style={{border:0, borderRadius:0}} readOnly value={base64} />
          </div>
        </div>
      )}
    </div>
  );
};

const Base64ToImage = () => {
  const [base64, setBase64] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');

  const handleConvert = () => {
    if (!base64) {
      setError('Please paste a Base64 string.');
      return;
    }

    // Basic validation: check if the string is a data URL
    if (!base64.startsWith('data:image')) {
      setError('Invalid Base64 image string. It should start with \'data:image\'.');
      setImage(null);
      return;
    }

    setImage(base64);
    setError('');
  };

  const handleClear = () => {
    setBase64('');
    setImage(null);
    setError('');
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="tool-pane flex-1">
        <div className="tool-pane-header">Input Base64 String</div>
        <div className="tool-pane-content p-0">
          <textarea 
            className="textarea h-full border-0" 
            style={{border:0, borderRadius:0}}
            value={base64}
            onChange={(e) => setBase64(e.target.value)}
            placeholder="Paste your Base64 string here..."
          />
        </div>
      </div>
      
      <div className="flex gap-2">
        <button className="btn primary" onClick={handleConvert}>Convert</button>
        <button className="btn" onClick={handleClear}>Clear</button>
      </div>

      {error && <div className="badge error">{error}</div>}
      
      {image && (
        <div className="tool-pane flex-1">
          <div className="tool-pane-header">Result</div>
          <div className="tool-pane-content text-center">
            <img src={image} alt="Decoded" className="image-preview" style={{maxWidth:'100%', maxHeight: '300px', objectFit:'contain'}} />
          </div>
        </div>
      )}
    </div>
  );
};

const Base64Converter = () => {
  const [mode, setMode] = useState('image-to-base64'); // 'image-to-base64' or 'base64-to-image'

  return (
    <div className="tool-root base64-converter">
      <ToolHeader title="Base64 Converter" subtitle="Encode images to Base64 or decode back to image" />
      
      <div className="tool-scroll-view flex flex-col gap-4">
        <div className="segmented">
          <button 
            className={`segmented-item ${mode === 'image-to-base64' ? 'active' : ''}`} 
            onClick={() => setMode('image-to-base64')}
          >
            Image to Base64
          </button>
          <button 
            className={`segmented-item ${mode === 'base64-to-image' ? 'active' : ''}`} 
            onClick={() => setMode('base64-to-image')}
          >
            Base64 to Image
          </button>
        </div>

        <div className="flex-1 min-h-0">
        {mode === 'image-to-base64' ? (
          <ImageToBase64 />
        ) : (
          <Base64ToImage />
        )}
        </div>
      </div>
    </div>
  );
};

export default Base64Converter;