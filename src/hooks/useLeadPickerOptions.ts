import { useAppSelector } from '@/redux/hooks/hooks';
import { INDUSTRY_SECTORS } from '@/types/teleSales.types';

/**
 * The lookup-driven option lists of the lead pickers (active industry sectors,
 * countries and business classifications from their slices), shared by the lead
 * form and the Proposal Builder's "complete the opportunity" form. The caller
 * dispatches the fetches.
 */
export function useLeadPickerOptions() {
  const { industrySectors } = useAppSelector((s) => s.industrySectors);
  const { countries } = useAppSelector((s) => s.countries);
  const { businessClassifications } = useAppSelector((s) => s.businessClassifications);

  const sectorOptions: string[] = industrySectors.length
    ? industrySectors.filter((s) => s.isActive).map((s) => s.name)
    : [...INDUSTRY_SECTORS];
  const countryOptions = countries.length
    ? countries.filter((c) => c.isActive).map((c) => c.name)
    : ['Egypt'];
  const classificationOptions = businessClassifications
    .filter((c) => c.isActive)
    .map((c) => c.name);

  return { sectorOptions, countryOptions, classificationOptions };
}

/** The options, with a value no longer on the list kept selectable first. */
export const withCurrent = (options: string[], current?: string | null) =>
  current && !options.includes(current) ? [current, ...options] : options;
