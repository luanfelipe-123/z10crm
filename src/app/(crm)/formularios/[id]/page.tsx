'use client';

import { useParams } from 'next/navigation';
import FormEditor from '@/components/forms/FormEditor';

export default function FormEditorPage() {
  const params = useParams<{ id: string }>();
  return <FormEditor formId={params.id} />;
}
