import type { Programme } from '../components/public-booking/types';
import { packages } from './programmes';
import { detailedProgrammes } from './programmeCatalog';

export const allBookingProgrammes: Programme[] = detailedProgrammes.map(prog => {
  if (prog.id === 'python-full-stack') {
    return {
      id: prog.id,
      title: prog.name,
      summary: prog.description,
      duration: prog.duration,
      currency: 'INR',
      technologies: prog.technologies,
      packages: packages.map(tier => ({
        id: tier.name.toLowerCase(),
        name: tier.name,
        priceMinor: tier.price * 100,
        inclusions: tier.inclusions.map(label => ({ label, included: true })),
      })),
      addons: [],
      feeDisclosure:
        'Listed fees from the supplied programme brief. Taxes, payment schedules, refunds, and exact package scope require academy confirmation. Internships depend on eligibility and availability; no internship or job is guaranteed.',
    };
  }

  return {
    id: prog.id,
    title: prog.name,
    summary: prog.description,
    duration: prog.duration,
    currency: 'INR',
    technologies: prog.technologies,
    packages: [
      {
        id: 'standard',
        name: 'Standard Track',
        priceMinor: prog.feeMinor,
        inclusions: [
          { label: 'Full track access & curriculum', included: true },
          { label: 'Guided technical projects', included: true },
          { label: 'Certificate of completion', included: true },
        ],
      },
    ],
    addons: [],
    feeDisclosure:
      'Listed fees from the supplied programme catalogue. Taxes and payment schedules require academy confirmation.',
  };
});
