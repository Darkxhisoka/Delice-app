import React from 'react';
import { SettingsModal } from './SettingsModal';
import { LanguageSwitcher } from './LanguageSwitcher';

interface SettingsProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  isOpen = true,
  onClose = () => {}
}) => {
  return <SettingsModal isOpen={isOpen} onClose={onClose} />;
};

export { LanguageSwitcher, SettingsModal };
export default Settings;
