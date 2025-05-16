'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { login, isLoading, error } = useAuthStore();
  const router = useRouter();

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'ایمیل الزامی است';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'ایمیل نامعتبر است';
    }
    
    if (!password) {
      newErrors.password = 'رمز عبور الزامی است';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await login({ email, password });
      router.push('/');
    } catch (error) {
    }
  };

  const fillTestAccount = () => {
    setEmail('user@example.com');
    setPassword('password');
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">ورود به حساب کاربری</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="ایمیل"
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              leftElement={<Mail className="h-4 w-4 text-muted-foreground" />}
              placeholder="example@mail.com"
            />
            
            <Input
              label="رمز عبور"
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              leftElement={<Lock className="h-4 w-4 text-muted-foreground" />}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
              placeholder="••••••••"
            />
            
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  className="ml-2 h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="remember">مرا به خاطر بسپار</label>
              </div>
              <Link href="#" className="text-primary hover:underline">
                فراموشی رمز عبور
              </Link>
            </div>
            
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            
            <Button
              variant="primary"
              fullWidth
              type="submit"
              isLoading={isLoading}
            >
              ورود
            </Button>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                حساب کاربری ندارید؟{' '}
                <Link href="/sign-up" className="text-primary hover:underline">
                  ثبت‌نام کنید
                </Link>
              </p>
              <button
                type="button"
                onClick={fillTestAccount}
                className="text-xs text-muted-foreground hover:text-primary mt-2 cursor-pointer underline"
              >
                پر کردن خودکار (برای آزمایش)
              </button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}