import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, Info, Shield, FileText, Users, Wine, Car, BookOpen } from 'lucide-react';
import { LegalDialog, LegalDocumentType } from '@/components/legal/LegalDialog';

const legalItems: { type: LegalDocumentType; title: string; icon: React.ElementType; description: string }[] = [
  { type: 'about', title: 'About R@lly', icon: Info, description: 'Learn about our app and mission' },
  { type: 'privacy', title: 'Privacy Policy', icon: Shield, description: 'How we handle your data' },
  { type: 'terms', title: 'Terms and Conditions', icon: FileText, description: 'Usage agreement and limitations' },
  { type: 'community', title: 'Community Guidelines', icon: Users, description: 'Standards for respectful use' },
  { type: 'alcohol', title: 'Alcohol Liability Release', icon: Wine, description: 'Responsibility acknowledgment' },
  { type: 'ride', title: 'Ride Coordination Waiver', icon: Car, description: 'Transportation disclaimer' },
  { type: 'acceptance', title: 'Acceptance of Policies', icon: BookOpen, description: 'Complete agreement overview' },
];

export default function Legal() {
  const [openDialog, setOpenDialog] = useState<LegalDocumentType | null>(null);

  return (
    <div className="min-h-screen pb-28 bg-gradient-to-b from-secondary/30 via-background to-secondary/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-20 w-80 h-80 bg-orange-400/5 rounded-full blur-3xl" />
      </div>

      <Header title="Legal & Policies" />
      
      <main className="container py-6 space-y-4 relative z-10">
        <p className="text-sm text-muted-foreground mb-4">
          Review R@lly's policies and legal documents. By using R@lly, you agree to all policies listed below.
        </p>

        <Card className="card-rally overflow-hidden">
          <CardContent className="p-0">
            {legalItems.map((item, index) => (
              <button
                key={item.type}
                onClick={() => setOpenDialog(item.type)}
                className={`w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left ${
                  index !== legalItems.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            R@lly is owned and operated by Bravo Boyz LLC. These policies form the complete agreement between you and Bravo Boyz LLC.
          </p>
        </div>
      </main>

      {legalItems.map((item) => (
        <LegalDialog
          key={item.type}
          open={openDialog === item.type}
          onOpenChange={(open) => setOpenDialog(open ? item.type : null)}
          documentType={item.type}
        />
      ))}

      <BottomNav />
    </div>
  );
}
