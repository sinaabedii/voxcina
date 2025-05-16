'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  
  const { register, isLoading, error } = useAuthStore();
  const router = useRouter();

  const validateForm = () => {
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};
    
    if (!name) {
      newErrors.name = 'نام الزامی است';
    }
    
    if (!email) {
      newErrors.email = 'ایمیل الزامی است';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'ایمیل نامعتبر است';
    }
    
    if (!password) {
      newErrors.password = 'رمز عبور الزامی است';
    } else if (password.length < 6) {
      newErrors.password = 'رمز عبور باید حداقل ۶ کاراکتر باشد';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'تکرار رمز عبور الزامی است';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'تکرار رمز عبور مطابقت ندارد';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await register({ name, email, password, confirmPassword });
      router.push('/');
    } catch (error) {
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">ایجاد حساب کاربری</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="نام و نام خانوادگی"
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              leftElement={<User className="h-4 w-4 text-muted-foreground" />}
              placeholder="علی محمدی"
            />
            
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
            
            <Input
              label="تکرار رمز عبور"
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              leftElement={<Lock className="h-4 w-4 text-muted-foreground" />}
              placeholder="••••••••"
            />
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="terms"
                className="ml-2 h-4 w-4 rounded border-gray-300"
                required
              />
              <label htmlFor="terms" className="text-sm">
                <span>قوانین و مقررات را </span>
                <Link href="#" className="text-primary hover:underline">
                  مطالعه کرده و می‌پذیرم
                </Link>
              </label>
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
              ثبت‌نام
            </Button>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                قبلاً ثبت‌نام کرده‌اید؟{' '}
                <Link href="/sign-in" className="text-primary hover:underline">
                  وارد شوید
                </Link>
              </p>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}