// Details we collect for manual JAMB orders. Used by the request form, server validation and the order pages.
export type JambField = { key: string; label: string; type: 'text' | 'tel' | 'email' | 'date' | 'select' | 'password'; required?: boolean; placeholder?: string; help?: string; options?: string[]; pattern?: RegExp; max?: number };

const year = new Date().getFullYear();
const YEARS = Array.from({ length: year - 2009 }, (_, i) => String(year - i));

const isPortal = (slug: string) => /portal/.test(slug) && !/no-portal/.test(slug);
const isNoPortal = (slug: string) => /no-portal/.test(slug);
const isRegRetrieval = (slug: string) => /registration-number-retrieval/.test(slug);
const isProfileRetrieval = (slug: string) => /profile-code-retrieval/.test(slug);
const isAdmission = (slug: string) => /admission/.test(slug);

export function jambFieldsFor(slug: string): JambField[] {
  const retrieval = isRegRetrieval(slug) || isProfileRetrieval(slug);
  const f: JambField[] = [
    { key: 'jamb_full_name', label: 'Full name as registered with JAMB', type: 'text', required: true, placeholder: 'Surname, First name, Other name' },
    { key: 'jamb_reg_number', label: 'JAMB registration number', type: 'text', required: !isRegRetrieval(slug), placeholder: 'e.g. 202512345678AB', pattern: /^[A-Za-z0-9]{8,16}$/, max: 16, help: isRegRetrieval(slug) ? 'Leave empty if you have lost it. That is what we are retrieving.' : undefined },
    { key: 'jamb_exam_year', label: 'Year you registered for JAMB', type: 'select', required: true, options: YEARS },
    { key: 'jamb_phone', label: 'Phone number on your JAMB profile', type: 'tel', required: true, placeholder: '080…', max: 15 },
    { key: 'jamb_email', label: 'Email on your JAMB profile', type: 'email', required: true, placeholder: 'name@example.com' },
    { key: 'jamb_dob', label: 'Date of birth', type: 'date', required: isNoPortal(slug) || retrieval, help: 'Used to confirm your identity.' },
    { key: 'jamb_profile_code', label: 'JAMB profile code', type: 'text', required: false, placeholder: 'Optional', help: isProfileRetrieval(slug) ? 'Leave empty if you have lost it.' : 'The code JAMB sent to your phone when you created your profile.' },
  ];
  if (isAdmission(slug)) f.push({ key: 'jamb_institution', label: 'Institution and course (if admitted)', type: 'text', required: false, placeholder: 'e.g. University of Lagos, Computer Science' });
  if (isPortal(slug)) f.push(
    { key: 'jamb_portal_email', label: 'JAMB portal login email', type: 'email', required: true },
    { key: 'jamb_portal_password', label: 'JAMB portal password', type: 'password', required: true, help: 'Used only to complete your request. Change your JAMB password after we finish.' },
  );
  return f;
}

export const jambNoteFor = (slug: string) =>
  isNoPortal(slug) ? 'No portal access: we will recover your records using the details below, so fill in as many as you can.'
  : isPortal(slug) ? 'Portal access: we log in to your JAMB portal to complete this. Your password is visible only to our team.' : '';

export const JAMB_LABELS: Record<string, string> = Object.fromEntries(
  ['jamb-x'].flatMap(() => jambFieldsFor('jamb-original-result-portal').concat(jambFieldsFor('jamb-admission-letter-printing')).map(x => [x.key, x.label] as [string, string])));
export const fieldLabel = (key: string) => JAMB_LABELS[key] || key.replaceAll('_', ' ');
export const isSecretKey = (key: string) => key === 'jamb_portal_password';
