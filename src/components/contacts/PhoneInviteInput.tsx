import { useState } from 'react';
import { Phone, Send, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface PhoneInviteInputProps {
  onInvite: (phone: string, name: string) => void;
  isLoading?: boolean;
}

export function PhoneInviteInput({ onInvite, isLoading }: PhoneInviteInputProps) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.trim()) {
      onInvite(phone.trim(), name.trim());
      setPhone('');
      setName('');
    }
  };

  // Format phone number as user types
  const handlePhoneChange = (value: string) => {
    // Remove non-numeric characters for storage
    const digits = value.replace(/\D/g, '');
    
    // Format for display (US format)
    let formatted = digits;
    if (digits.length >= 4 && digits.length <= 6) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length >= 7) {
      formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    
    setPhone(formatted);
  };

  const isValidPhone = phone.replace(/\D/g, '').length >= 10;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm flex items-center gap-2">
          <Phone className="h-3 w-3" />
          Phone Number
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="(555) 123-4567"
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          className="text-lg tracking-wide"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm flex items-center gap-2">
          <User className="h-3 w-3" />
          Name (optional)
        </Label>
        <Input
          id="name"
          type="text"
          placeholder="Friend's name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <Button 
        type="submit" 
        className="w-full gap-2"
        disabled={!isValidPhone || isLoading}
      >
        <Send className="h-4 w-4" />
        {isLoading ? 'Sending...' : 'Send SMS Invite'}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        This will open your SMS app with a pre-filled invite message
      </p>
    </form>
  );
}
