import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import './base64Converter.css';

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
    <div className="conversion-area">
      <h2>Image to Base64</h2>
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        {image ? (
          <img src={image} alt="Preview" className="image-preview" />
        ) : (
          <p>Drag & drop an image here, or click to select one</p>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      {base64 && (
        <div className="result-area">
          <textarea readOnly value={base64} />
          <div className="button-group">
            <button onClick={handleCopy}>Copy to Clipboard</button>
            <button onClick={handleClear}>Clear</button>
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
    <div className="conversion-area">
      <h2>Base64 to Image</h2>
      <textarea 
        value={base64}
        onChange={(e) => setBase64(e.target.value)}
        placeholder="Paste your Base64 string here"
      />
      <div className="button-group">
        <button onClick={handleConvert}>Convert</button>
        <button onClick={handleClear}>Clear</button>
      </div>
      {error && <p className="error">{error}</p>}
      {image && (
        <div className="result-area">
          <h3>Result:</h3>
          <img src={image} alt="Decoded from Base64" className="image-preview" />
        </div>
      )}
    </div>
  );
};

const Base64Converter = () => {
  const [mode, setMode] = useState('image-to-base64'); // 'image-to-base64' or 'base64-to-image'

  return (
    <div className="base64-converter">
      <div className="mode-toggle">
        <button 
          className={mode === 'image-to-base64' ? 'active' : ''} 
          onClick={() => setMode('image-to-base64')}
        >
          Image to Base64
        </button>
        <button 
          className={mode === 'base64-to-image' ? 'active' : ''} 
          onClick={() => setMode('base64-to-image')}
        >
          Base64 to Image
        </button>
      </div>

      {mode === 'image-to-base64' ? (
        <ImageToBase64 />
      ) : (
        <Base64ToImage />
      )}
    </div>
  );
};

export default Base64Converter;