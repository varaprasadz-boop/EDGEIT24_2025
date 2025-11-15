import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import countries from "@shared/data/countries.json";

interface Country {
  name: string;
  isoCode: string;
  phoneCode: string;
}

interface CountrySelectorProps {
  value?: string;
  onChange?: (country: Country | null) => void;
  onPhoneCodeChange?: (phoneCode: string) => void;
  disabled?: boolean;
  placeholder?: string;
  testId?: string;
}

const getCountryFlag = (isoCode: string): string => {
  return isoCode
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
};

export function CountrySelector({
  value,
  onChange,
  onPhoneCodeChange,
  disabled = false,
  placeholder = "Select country",
  testId = "country-selector",
}: CountrySelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedCountry = countries.find(
    (country) => country.isoCode === value
  );

  const handleSelect = (isoCode: string) => {
    const country = countries.find((c) => c.isoCode === isoCode);
    if (country) {
      onChange?.(country);
      onPhoneCodeChange?.(country.phoneCode);
      setOpen(false);
    } else {
      onChange?.(null);
      onPhoneCodeChange?.("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-testid={testId}
          className="w-full justify-between"
        >
          {selectedCountry ? (
            <span className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">
                {getCountryFlag(selectedCountry.isoCode)}
              </span>
              <span>{selectedCountry.name}</span>
              <span className="text-muted-foreground text-sm">
                {selectedCountry.phoneCode}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search country..."
            data-testid={`${testId}-search`}
          />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.isoCode}
                  value={`${country.name} ${country.isoCode} ${country.phoneCode}`}
                  onSelect={() => handleSelect(country.isoCode)}
                  data-testid={`${testId}-option-${country.isoCode}`}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country.isoCode ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="text-lg mr-2" aria-hidden="true">
                    {getCountryFlag(country.isoCode)}
                  </span>
                  <span className="flex-1">{country.name}</span>
                  <span className="text-muted-foreground text-sm">
                    {country.phoneCode}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
