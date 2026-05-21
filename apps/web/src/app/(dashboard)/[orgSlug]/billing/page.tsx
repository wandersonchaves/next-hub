'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/services/api';
import { useParams } from 'next/navigation';

const plans = [
  {
    name: 'Free',
    price: '$0',
    features: ['Up to 3 members', 'Basic analytics'],
    planId: 'FREE',
  },
  {
    name: 'Pro',
    price: '$29/mo',
    features: ['Unlimited members', 'Advanced analytics', 'Priority support'],
    planId: 'PRO',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    features: ['Custom contracts', 'Dedicated manager', 'SLA'],
    planId: 'ENTERPRISE',
  },
];

export default function BillingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const { orgSlug } = useParams();

  const handleUpgrade = async (planId: string) => {
    if (planId === 'FREE') return;
    
    setLoading(planId);
    try {
      const response = await apiRequest<{ url: string }>('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ orgSlug, plan: planId }),
      });
      
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Failed to start checkout', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Choose your plan</h1>
      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div key={plan.planId} className="border rounded-lg p-6 flex flex-col">
            <h2 className="text-xl font-bold mb-2">{plan.name}</h2>
            <div className="text-3xl font-bold mb-6">{plan.price}</div>
            <ul className="mb-8 flex-grow">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center mb-2">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <Button 
              onClick={() => handleUpgrade(plan.planId)}
              disabled={loading === plan.planId || plan.planId === 'FREE'}
              className="w-full"
            >
              {loading === plan.planId ? 'Loading...' : plan.planId === 'FREE' ? 'Current Plan' : 'Upgrade'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
