// ────────────────────────────────────────────────────────────────────────────
// Techboloy Med — Phase 2: Patient Character System & Clinical Case Linker
// ────────────────────────────────────────────────────────────────────────────

export interface CharacterVoiceConfig {
  pitch: number;
  rate: number;
  lang: string;
  gender: 'female' | 'male';
  voiceName: string;
  nativeVoiceName?: string;
  preferredVoices: string[];
}

export interface PatientCharacter {
  characterId: string;
  name: string;
  nameBn: string;
  age: number;
  sex: 'female' | 'male';
  ethnicity: string;
  appearance: string;
  appearanceBn?: string;
  clothing: string;
  clothingBn?: string;
  voice: CharacterVoiceConfig;
  personality: 'concerned' | 'anxious' | 'stoic' | 'talkative' | 'quiet' | 'dramatic' | 'calm' | 'cooperative';
  defaultEmotion: 'neutral' | 'concerned' | 'anxious' | 'relieved' | 'confused' | 'pain';
  avatarProvider: 'realistic-human' | 'static-image' | 'webgl-3d';
  avatarAsset: string;
  thumbnail: string;
  languageSupport: string[];
  clinicalBio: string;
  recommendedCases: string[];
}

export const PATIENT_CHARACTERS: PatientCharacter[] = [
  // Character A: Middle-Aged Female (Nusrat Jahan, 46y)
  {
    characterId: 'char_nusrat',
    name: 'Nusrat Jahan',
    nameBn: 'নুসরাত জাহান',
    age: 46,
    sex: 'female',
    ethnicity: 'South Asian (Bangladeshi)',
    appearance: '46-year-old female, tired warm brown eyes with dark fatigue circles, slight dehydration on lips, visibly exhausted from high fever and severe myalgia.',
    appearanceBn: '৪৬ বছর বয়সী নারী, ক্লান্ত চোখের দৃষ্টি, তীব্র জ্বর ও শরীর ব্যথায় অবসাদগ্রস্ত কিন্তু সচেতন।',
    clothing: 'Deep indigo blue traditional cotton Salwar Kameez with soft floral embroidery, draped georgette dupatta',
    clothingBn: 'গাঢ় নীল সুতি সেলোয়ার কামিজ ও নরম ওড়না',
    voice: {
      pitch: 1.05,
      rate: 0.92,
      lang: 'bn-BD',
      gender: 'female',
      voiceName: 'Bangla Female (Natural Warm)',
      nativeVoiceName: 'bn-BD-Wavenet-A',
      preferredVoices: ['Google বাংলা Female', 'bn-BD-Standard-A', 'Microsoft Muskan Online (Natural) - Bengali (Bangladesh)'],
    },
    personality: 'concerned',
    defaultEmotion: 'concerned',
    avatarProvider: 'realistic-human',
    avatarAsset: '/characters/nusrat_jahan.jpg',
    thumbnail: '/characters/nusrat_jahan.jpg',
    languageSupport: ['bn', 'en', 'banglish'],
    clinicalBio: 'Homemaker and mother presenting with 4-day continuous high fever, severe retro-orbital pain, severe joint and back myalgia (breakbone ache), and petechial rash.',
    recommendedCases: ['Acute Febrile Illness with Severe Myalgia', 'Dengue Fever with Warning Signs', 'febrile_01'],
  },

  // Character B: Middle-Aged Male (Md. Rafiqul Islam, 52y)
  {
    characterId: 'char_rafiqul',
    name: 'Md. Rafiqul Islam',
    nameBn: 'মো. রফিকুল ইসলাম',
    age: 52,
    sex: 'male',
    ethnicity: 'South Asian (Bangladeshi)',
    appearance: '52-year-old male with neatly trimmed mustache, pale and diaphoretic forehead, hand clutched over central chest (Levine sign), anxious facial expression.',
    appearanceBn: '৫২ বছর বয়সী পুরুষ, কপালে হালকা ঘাম, বুকে চেপে ধরা ব্যথায় উদ্বিগ্ন ও বিচলিত মুখচ্ছবি।',
    clothing: 'Formal light gray buttoned collared business shirt, loosened collar button',
    clothingBn: 'হালকা ছাই রঙের ফরমাল কলার শার্ট',
    voice: {
      pitch: 0.92,
      rate: 0.88,
      lang: 'bn-BD',
      gender: 'male',
      voiceName: 'Bangla Male (Dignified Anxious)',
      nativeVoiceName: 'bn-BD-Wavenet-B',
      preferredVoices: ['Google বাংলা Male', 'bn-BD-Standard-B', 'Microsoft Bashkar Online (Natural) - Bengali (Bangladesh)'],
    },
    personality: 'anxious',
    defaultEmotion: 'anxious',
    avatarProvider: 'realistic-human',
    avatarAsset: '/characters/rafiqul_islam.jpg',
    thumbnail: '/characters/rafiqul_islam.jpg',
    languageSupport: ['bn', 'en', 'banglish'],
    clinicalBio: 'Bank manager experiencing crushing retrosternal chest tightness radiating to the left shoulder and jaw, aggravated by brisk walking, with associated diaphoresis.',
    recommendedCases: ['Crushing Retrosternal Chest Pain', 'Acute Coronary Syndrome (NSTEMI/STEMI)', 'cardiac_01'],
  },

  // Character C: Young Male (Tanvir Ahmed, 22y)
  {
    characterId: 'char_tanvir',
    name: 'Tanvir Ahmed',
    nameBn: 'তানভীর আহমেদ',
    age: 22,
    sex: 'male',
    ethnicity: 'South Asian (Bangladeshi)',
    appearance: '22-year-old young male university student, pale and guarded, curled slightly forward to protect right lower abdomen, grimaces on movement.',
    appearanceBn: '২২ বছর বয়সী তরুণ, পেটের ব্যথায় কিছুটা ঝুঁকে থাকা, নড়াচড়ায় অস্বস্তি ও হালকা কাতর মুখাবয়ব।',
    clothing: 'Olive green casual polo t-shirt with soft athletic fabric',
    clothingBn: 'অলিভ গ্রিন ক্যাজুয়াল পোলো টি-শার্ট',
    voice: {
      pitch: 1.1,
      rate: 1.0,
      lang: 'bn-BD',
      gender: 'male',
      voiceName: 'Bangla Male (Youthful Clear)',
      nativeVoiceName: 'bn-BD-Standard-B',
      preferredVoices: ['Google বাংলা Male Young', 'bn-BD-Standard-B'],
    },
    personality: 'anxious',
    defaultEmotion: 'pain',
    avatarProvider: 'realistic-human',
    avatarAsset: '/characters/tanvir_ahmed.jpg',
    thumbnail: '/characters/tanvir_ahmed.jpg',
    languageSupport: ['bn', 'en', 'banglish'],
    clinicalBio: 'Engineering student presenting with 18-hour history of periumbilical dull ache that has localized to the sharp right iliac fossa (McBurney point), accompanied by anorexia and low-grade fever.',
    recommendedCases: ['Migratory RLQ Abdominal Pain', 'Acute Appendicitis', 'appendicitis_01'],
  },

  // Character D: Young Female (Fatema Begum, 24y)
  {
    characterId: 'char_fatema',
    name: 'Fatema Begum',
    nameBn: 'ফাতেমা বেগম',
    age: 24,
    sex: 'female',
    ethnicity: 'South Asian (Bangladeshi)',
    appearance: '24-year-old young female, modest expression, holding right temple due to unilateral pulsating hemicranial throbbing, squinting against bright room light.',
    appearanceBn: '২৪ বছর বয়সী তরুণী, কপালে হাত দিয়ে মৃদু আলোতেও চোখ কিছুটা কুঁচকানো, তীব্র আধকপালি ব্যথায় ব্যতিব্যস্ত।',
    clothing: 'Pastel peach printed Salwar Kameez with matching dupatta draped gracefully',
    clothingBn: 'হালকা পিচ রঙের সুতি কামিজ ও ওড়না',
    voice: {
      pitch: 1.15,
      rate: 0.95,
      lang: 'bn-BD',
      gender: 'female',
      voiceName: 'Bangla Female (Soft Gentle)',
      nativeVoiceName: 'bn-BD-Standard-A',
      preferredVoices: ['Google বাংলা Female', 'bn-BD-Standard-A'],
    },
    personality: 'quiet',
    defaultEmotion: 'concerned',
    avatarProvider: 'realistic-human',
    avatarAsset: '/characters/fatema_begum.jpg',
    thumbnail: '/characters/fatema_begum.jpg',
    languageSupport: ['bn', 'en', 'banglish'],
    clinicalBio: 'Primary school teacher suffering from recurrent unilateral throbbing headaches preceded by visual aura and nausea.',
    recommendedCases: ['Severe Throbbing Unilateral Headache', 'Migraine with Aura', 'headache_01'],
  },

  // Character E: Older Male (Abdul Motin, 68y)
  {
    characterId: 'char_abdul',
    name: 'Abdul Motin',
    nameBn: 'আব্দুল মতিন',
    age: 68,
    sex: 'male',
    ethnicity: 'South Asian (Bangladeshi)',
    appearance: '68-year-old elderly male, distinguished white-and-gray beard, weathered wrinkles, sitting upright with mild respiratory effort.',
    appearanceBn: '৬৮ বছর বয়সী প্রবীণ ব্যক্তি, সাদা দাড়ি, বয়সের ছাপযুক্ত ব্যক্তিত্বময় চেহারা, মৃদু শ্বাসকষ্টে কিছুটা ক্লান্ত।',
    clothing: 'Traditional light cream embroidered cotton Panjabi',
    clothingBn: 'হালকা ঘিয়ে রঙের সুতি ঐতিহ্যবাহী পাঞ্জাবি',
    voice: {
      pitch: 0.85,
      rate: 0.85,
      lang: 'bn-BD',
      gender: 'male',
      voiceName: 'Bangla Male (Elderly Dignified)',
      nativeVoiceName: 'bn-BD-Wavenet-B',
      preferredVoices: ['Google বাংলা Male Senior', 'bn-BD-Standard-B'],
    },
    personality: 'calm',
    defaultEmotion: 'concerned',
    avatarProvider: 'realistic-human',
    avatarAsset: '/characters/abdul_motin.jpg',
    thumbnail: '/characters/abdul_motin.jpg',
    languageSupport: ['bn', 'en', 'banglish'],
    clinicalBio: 'Retired civil servant with long-standing exertional breathlessness, chronic productive morning cough, and bilateral ankle swelling.',
    recommendedCases: ['Progressive Shortness of Breath and Chronic Cough', 'COPD Exacerbation', 'Heart Failure'],
  },

  // Character F: Older Female (Rokeya Begum, 63y)
  {
    characterId: 'char_rokeya',
    name: 'Rokeya Begum',
    nameBn: 'রোকেয়া বেগম',
    age: 63,
    sex: 'female',
    ethnicity: 'South Asian (Bangladeshi)',
    appearance: '63-year-old elderly female with neatly parted silver-gray hair, cautious maternal expression with intermittent right upper abdominal discomfort.',
    appearanceBn: '৬৩ বছর বয়সী প্রবীণ নারী, কাঁচাপাকা চুল, পেটের ডানপাশের ওপরের ব্যথায় সতর্ক ও চিন্তিত মুখাবয়ব।',
    clothing: 'Traditional printed green and cream Bengali cotton saree',
    clothingBn: 'সবুজ ও ঘিয়ে রঙের রুচিশীল সুতি শাড়ি',
    voice: {
      pitch: 1.0,
      rate: 0.9,
      lang: 'bn-BD',
      gender: 'female',
      voiceName: 'Bangla Female (Elderly Gentle)',
      nativeVoiceName: 'bn-BD-Wavenet-A',
      preferredVoices: ['Google বাংলা Female Senior', 'bn-BD-Standard-A'],
    },
    personality: 'concerned',
    defaultEmotion: 'concerned',
    avatarProvider: 'realistic-human',
    avatarAsset: '/characters/rokeya_begum.jpg',
    thumbnail: '/characters/rokeya_begum.jpg',
    languageSupport: ['bn', 'en', 'banglish'],
    clinicalBio: 'Grandmother presenting with colicky right upper quadrant abdominal pain worsening after fatty meals, radiating to right scapula.',
    recommendedCases: ['Postprandial Right Upper Quadrant Pain', 'Acute Cholecystitis', 'Biliary Colic'],
  },
];

export class PatientCharacterSystem {
  public static getAllCharacters(): PatientCharacter[] {
    return PATIENT_CHARACTERS;
  }

  public static getCharacterById(characterId: string): PatientCharacter {
    const found = PATIENT_CHARACTERS.find((c) => c.characterId === characterId);
    return found || PATIENT_CHARACTERS[0];
  }

  public static getCharacterForCase(patientCase: {
    patientName?: string | null;
    patientGender?: string | null;
    patientAge?: number | null;
    chiefComplaint?: string | null;
    title?: string | null;
    avatarGender?: string | null;
    avatarAgeGroup?: string | null;
  }): PatientCharacter {
    if (!patientCase) return PATIENT_CHARACTERS[0];

    const name = (patientCase.patientName || '').toLowerCase();
    const gender = (patientCase.patientGender || patientCase.avatarGender || '').toLowerCase();
    const age = patientCase.patientAge || 40;
    const complaint = (patientCase.chiefComplaint || patientCase.title || '').toLowerCase();

    // Direct name or complaint matching
    if (name.includes('নুসরাত') || name.includes('nusrat') || complaint.includes('dengue') || complaint.includes('ডেঙ্গু')) {
      return this.getCharacterById('char_nusrat');
    }
    if (name.includes('রফিকুল') || name.includes('rafiqul') || complaint.includes('chest') || complaint.includes('বুক') || complaint.includes('nstemi')) {
      return this.getCharacterById('char_rafiqul');
    }
    if (name.includes('তানভীর') || name.includes('tanvir') || complaint.includes('appendicitis') || complaint.includes('rlq')) {
      return this.getCharacterById('char_tanvir');
    }
    if (name.includes('ফাতেমা') || name.includes('fatema') || complaint.includes('migraine') || complaint.includes('মাথাব্যথা')) {
      return this.getCharacterById('char_fatema');
    }
    if (name.includes('আব্দুল') || name.includes('abdul') || name.includes('motin') || complaint.includes('copd') || complaint.includes('breath')) {
      return this.getCharacterById('char_abdul');
    }
    if (name.includes('রোকেয়া') || name.includes('rokeya') || complaint.includes('cholecystitis') || complaint.includes('ruq')) {
      return this.getCharacterById('char_rokeya');
    }

    // Demographic fallback matching
    const isFemale = gender.includes('female') || gender.includes('মহিলা') || gender.includes('woman');

    if (isFemale) {
      if (age < 32) return this.getCharacterById('char_fatema');
      if (age >= 55) return this.getCharacterById('char_rokeya');
      return this.getCharacterById('char_nusrat');
    } else {
      if (age < 30) return this.getCharacterById('char_tanvir');
      if (age >= 60) return this.getCharacterById('char_abdul');
      return this.getCharacterById('char_rafiqul');
    }
  }
}

export default PatientCharacterSystem;
