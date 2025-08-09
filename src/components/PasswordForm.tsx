import React, { useState } from 'react';
import { Save, X, Eye, EyeOff } from 'lucide-react';

interface PasswordFormProps {
  onSave: (label: string, password: string, website?: string) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}

const PasswordForm: React.FC<PasswordFormProps> = ({ onSave, onCancel, loading }) => {
  const [label, setLabel] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !password.trim()) return;
    
    await onSave(label.trim(), password, website.trim() || undefined);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  return (
    <div className="password-form">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Add New Password</h2>
        <button
          className="glass-button"
          onClick={onCancel}
          style={{ width: 'auto', padding: '8px' }}
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Label *</label>
          <input
            type="text"
            className="glass-input"
            placeholder="e.g., Gmail, Facebook, Work Email"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Website (optional)</label>
          <input
            type="url"
            className="glass-input"
            placeholder="https://example.com"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label className="form-label" style={{ margin: 0 }}>Password *</label>
            <button
              type="button"
              onClick={generatePassword}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-blue)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                textDecoration: 'underline'
              }}
            >
              Generate Strong Password
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              className="glass-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: '3rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button
            type="button"
            className="glass-button"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="glass-button success"
            disabled={loading || !label.trim() || !password.trim()}
          >
            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
                Saving...
              </div>
            ) : (
              <>
                <Save size={16} />
                Save Password
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PasswordForm;
