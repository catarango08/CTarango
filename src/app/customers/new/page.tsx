import { PageHeader } from '@/components/ui';
import { NewCustomerForm } from './form';

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader title="New customer" subtitle="Name and phone are enough. Fill the rest in later from the card." />
      <NewCustomerForm />
    </>
  );
}
