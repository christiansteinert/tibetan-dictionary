/**
 * Radix UI DropdownMenu for language selection, settings, etc.
 */
import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Language } from '@/types';

import {
  HamburgerMenuIcon,
  MagnifyingGlassIcon,
  GearIcon,
  CheckCircledIcon,
  CircleIcon,
  QuestionMarkCircledIcon,
} from '@radix-ui/react-icons';
import styles from './HamburgerMenu.module.css';
import HelpDialog from './HelpDialog';

interface Props {
  inputLang: Language;
  isLightMode: boolean;
  onSelectLanguage: (lang: Language) => void;
  onOpenSettings: () => void;
  onOpenExtendedSearch?: () => void;
}

export default function HamburgerMenu({
  inputLang,
  isLightMode,
  onSelectLanguage,
  onOpenSettings,
  onOpenExtendedSearch,
}: Props) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={`${styles.triggerBtn} ${isLightMode ? styles.light : styles.dark}`}
          aria-label="Open menu"
        >
          <HamburgerMenuIcon width={24} height={24} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={`${styles.content} ${isLightMode ? styles.light : styles.dark}`}
          align="end"
          sideOffset={6}
        >
          {/* ── Language group ── */}
          <DropdownMenu.Label className={styles.label}>
            Language
          </DropdownMenu.Label>

          <DropdownMenu.RadioGroup
            value={inputLang}
            onValueChange={(val) => onSelectLanguage(val as Language)}
          >
            <DropdownMenu.RadioItem value="tib" className={styles.radioItem}>
              <DropdownMenu.ItemIndicator className={styles.indicator}>
                <CheckCircledIcon />
              </DropdownMenu.ItemIndicator>
              <span className={styles.inactiveIcon}>
                <CircleIcon />
              </span>
              Tibetan
            </DropdownMenu.RadioItem>

            <DropdownMenu.RadioItem value="en" className={styles.radioItem}>
              <DropdownMenu.ItemIndicator className={styles.indicator}>
                <CheckCircledIcon />
              </DropdownMenu.ItemIndicator>
              <span className={styles.inactiveIcon}>
                <CircleIcon />
              </span>
              English
            </DropdownMenu.RadioItem>

            <DropdownMenu.RadioItem value="skt" className={styles.radioItem}>
              <DropdownMenu.ItemIndicator className={styles.indicator}>
                <CheckCircledIcon />
              </DropdownMenu.ItemIndicator>
              <span className={styles.inactiveIcon}>
                <CircleIcon />
              </span>
              Sanskrit
            </DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>

          <DropdownMenu.Separator className={styles.separator} />

          {/* ── Extended Search ── */}
          <DropdownMenu.Item
            className={`${styles.item}`}
            onSelect={onOpenExtendedSearch}
          >
            <MagnifyingGlassIcon className={styles.itemIcon} />
            Extended Search
          </DropdownMenu.Item>

          <DropdownMenu.Separator className={styles.separator} />

          {/* ── Help ── */}
          <DropdownMenu.Item
            className={styles.item}
            onSelect={() => setHelpOpen(true)}
          >
            <QuestionMarkCircledIcon className={styles.itemIcon} />
            Search Help
          </DropdownMenu.Item>

          <DropdownMenu.Separator className={styles.separator} />

          {/* ── Settings ── */}
          <DropdownMenu.Item className={styles.item} onSelect={onOpenSettings}>
            <GearIcon className={styles.itemIcon} />
            Settings
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>

    <HelpDialog
      open={helpOpen}
      isLightMode={isLightMode}
      onOpenChange={setHelpOpen}
    />
    </>
  );
}
