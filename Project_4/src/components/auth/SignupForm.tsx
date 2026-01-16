import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SignupFormProps {
  onSubmit: (email: string, password: string, name: string) => Promise<void>;
  isLoading?: boolean;
}

const passwordRequirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /\d/.test(p) },
];

export function SignupForm({ onSubmit, isLoading }: SignupFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const passwordValid = passwordRequirements.every((req) => req.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (!passwordValid) {
      setError('Password does not meet requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    try {
      await onSubmit(email, password, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <Input
        name="name"
        label="Full Name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="John Doe"
        icon={<User className="w-4 h-4" />}
        autoComplete="name"
        required
      />

      <Input
        name="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        icon={<Mail className="w-4 h-4" />}
        autoComplete="email"
        required
      />

      <Input
        name="password"
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Create a strong password"
        icon={<Lock className="w-4 h-4" />}
        autoComplete="new-password"
        required
      />

      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          {passwordRequirements.map((req, index) => (
            <div
              key={index}
              className={`flex items-center gap-1 text-xs ${
                password.length > 0 && req.test(password)
                  ? 'text-verdict-supported'
                  : 'text-muted-foreground'
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              {req.label}
            </div>
          ))}
        </div>
      </div>

      <Input
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm your password"
        icon={<Lock className="w-4 h-4" />}
        autoComplete="new-password"
        error={confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : undefined}
        required
      />

      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-muted-foreground">
          I agree to the{' '}
          <Link to="/terms" className="text-primary hover:text-primary/80">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-primary hover:text-primary/80">
            Privacy Policy
          </Link>
        </span>
      </label>

      <Button type="submit" className="w-full" loading={isLoading} disabled={!passwordValid}>
        Create Account
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:text-primary/80 font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}
