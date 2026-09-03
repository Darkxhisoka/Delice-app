import { AppLanguage } from './index';

export const translations: Record<AppLanguage, any> = {
  fr: {
    common: {
      settings: 'Paramètres',
      sync: 'Synchronisation',
      language: 'Langue',
      logout: 'Déconnexion',
      search: 'Rechercher...',
      close: 'Fermer',
      save: 'Enregistrer',
      cancel: 'Annuler',
    },
    nav: {
      lab_central: 'Lab Central',
      retail_store: 'Boutique',
      admin_context: 'Contexte Admin',
    },
    settings: {
      display_prefs: 'Langue & Localisation',
      display_prefs_desc: "Choisir la langue de l'interface (Support RTL inclus)",
      audio_haptics: 'Effets Sonores & Retours Haptiques',
      audio_haptics_desc: 'Retours tactiles natifs et audio synthétique',
      printer: 'Imprimante Thermique POS',
      printer_desc: 'Impression directe silencieuse pour tickets',
    }
  },
  ar: {
    common: {
      settings: 'الإعدادات',
      sync: 'المزامنة',
      language: 'اللغة',
      logout: 'تسجيل الخروج',
      search: 'بحث...',
      close: 'إغلاق',
      save: 'حفظ',
      cancel: 'إلغاء',
    },
    nav: {
      lab_central: 'المخبر المركزي',
      retail_store: 'نقطة البيع',
      admin_context: 'سياق المسؤول',
    },
    settings: {
      display_prefs: 'اللغة والتعريب',
      display_prefs_desc: 'اختر لغة الواجهة (يتضمن دعم RTL)',
      audio_haptics: 'المؤثرات الصوتية وردود الفعل اللمسية',
      audio_haptics_desc: 'ردود فعل لمسية أصلية وصوت اصطناعي',
      printer: 'طابعة POS الحرارية',
      printer_desc: 'طباعة مباشرة صامتة للتذاكر',
    }
  }
};
