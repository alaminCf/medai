// ────────────────────────────────────────────────────────────────────────────
// Techboloy Med — Phase 2: Realistic Human Patient Character Catalog & Service
// ────────────────────────────────────────────────────────────────────────────

import { PatientCharacter } from '../types/character';
import { PatientCase } from '../types';

export const PATIENT_CHARACTERS: PatientCharacter[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // Character B: Middle-Aged Female (Nusrat Jahan, 46y)
  // ──────────────────────────────────────────────────────────────────────────
  {
    characterId: 'char_nusrat',
    name: 'Nusrat Jahan',
    nameBn: 'নুসরাত জাহান',
    age: 46,
    sex: 'female',
    ethnicity: 'South Asian (Bangladeshi)',
    appearance: '46-year-old female patient with natural skin texture, dark hair tied back with subtle silver strands, fatigued and weary eyes reflecting acute febrile illness and pain.',
    appearanceBn: '৪৬ বছর বয়সী বাংলাদেশি নারী, চোখে-মুখে তীব্র জ্বর ও ব্যথার ক্লান্তি, প্রাকৃতিক ত্বকের গঠন, পরিপাটি করে পেছনে বাঁধা চুল।',
    clothing: 'Hospital teal patient consultation top',
    clothingBn: 'হাসপাতালের টিল রঙের আরামদায়ক রোগীর পোশাক',
    voice: {
      pitch: 1.05,
      rate: 0.95,
      lang: 'bn-BD',
      gender: 'female',
      voiceName: 'Bangla Female (Natural Warm)',
      nativeVoiceName: 'bn-BD-Wavenet-A',
      preferredVoices: ['Google বাংলা', 'Microsoft Subarna Online', 'bn-BD-language'],
    },
    personality: 'concerned',
    defaultEmotion: 'concerned',
    avatarProvider: 'realistic-human',
    avatarAsset: '/characters/nusrat_jahan.jpg',
    thumbnail: '/characters/nusrat_jahan.jpg',
    languageSupport: ['bn', 'en', 'banglish'],
    clinicalBio: 'Homemaker residing in Dhaka. Presenting with high-grade continuous fever for 4 days, retro-orbital eye pain, and agonizing breakbone body ache.',
    recommendedCases: ['High-Grade Dengue Fever with Body Ache', 'dengue_fever_01', 'Viral Fever Consultation'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Character C: Middle-Aged Male (Md. Rafiqul Islam, 52y)
  // ──────────────────────────────────────────────────────────────────────────
  {
    characterId: 'char_rafiqul',
    name: 'Md. Rafiqul Islam',
    nameBn: 'মো. রফিকুল ইসলাম',
    age: 52,
    sex: 'male',
    ethnicity: 'South Asian (Bangladeshi)',
    appearance: '52-year-old male with salt-and-pepper short beard, deep-set anxious eyes, natural skin with mild diaphoresis and distress posture.',
    appearanceBn: '৫২ বছর বয়সী পুরুষ, কাঁচা-পাকা চাপদাড়ি, চোখে তীব্র দুশ্চিন্তা ও বুক ব্যথার অস্বস্তি, কপালে হালকা ঘামের আভা।',
    clothing: 'Modest navy blue collared shirt',
    clothingBn: 'গাঢ় নীল রঙের কলারযুক্ত সাধারণ শার্ট',
    voice: {
      pitch: 0.92,
      rate: 0.9,
      lang: 'bn-BD',
      gender: 'male',
      voiceName: 'Bangla Male (Deep Expressive)',
      nativeVoiceName: 'bn-BD-Wavenet-B',
      preferredVoices: ['Google বাংলা Male', 'Microsoft Bashkar Online', 'bn-BD-male'],
    },
    personality: 'anxious',
    defaultEmotion: 'anxious',
    avatarProvider: 'realistic-human',
    avatarAsset: '/characters/rafiqul_islam.jpg',
    thumbnail: '/characters/rafiqul_islam.jpg',
    languageSupport: ['bn', 'en', 'banglish'],
    clinicalBio: 'Small business owner presenting with sudden retrosternal crushing chest heaviness radiating to left shoulder, accompanied by diaphoresis.',
    recommendedCases: ['Acute Chest Pain and Radiating Discomfort', 'NSTEMI', 'Angina Pectoris', 'chest_pain_01'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Character D: Young Male (Tanvir Ahmed, 22y)
  // ──────────────────────────────────────────────────────────────────────────
  {
    characterId: 'char_tanvir',
    name: 'Tanvir Ahmed',
    nameBn: 'তানভীর আহমেদ',
    age: 22,
    sex: 'male',
    ethnicity: 'South Asian (Bangladeshi)',
    appearance: '22-year-old university student, distressed guarding posture, slight stubble, expressive dark eyes showing abdominal guarding and acute pain.',
    appearanceBn: '২২ বছর বয়সী তরুণ বিশ্ববিদ্যালয় ছাত্র, পেটের ডানপাশে ব্যথায় কুঁকড়ে থাকা কষ্টকর মুখাবয়ব, হালকা দাড়ি।',
    clothing: 'Casual heather grey hoodie over t-shirt',
    clothingBn: 'ধূসর রঙের আরামদায়ক ক্যাজুয়াল হুডি ও টি-শার্ট',
    voice: {
      pitch: 1.02,
      rate: 1.05,
      lang: 'bn-BD',
      gender: 'male',
      voiceName: 'Bangla Male (Youth Urgent)',
      nativeVoiceName: 'bn-BD-Standard-B',
      preferredVoices: ['Google বাংলা', 'bn-BD-Standard-B'],
    },
    personality: 'anxious',
    defaultEmotion: 'anxious',
    avatarProvider: 'realistic-human',
    avatarAsset: '/characters/tanvir_ahmed.jpg',
    thumbnail: '/characters/tanvir_ahmed.jpg',
    languageSupport: ['bn', 'en', 'banglish'],
    clinicalBio: 'Undergraduate student experiencing migratory periumbilical to right lower quadrant abdominal pain with low-grade fever and anorexia.',
    recommendedCases: ['Acute Lower Right Abdominal Pain', 'Appendicitis', 'rlq_pain_01'],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // Character A: Young Female (Fatema Begum, 24y)
  // ──────────────────────────────────────────────────────────────────────────
  {
    characterId: 'char_fatema',
    name: 'Fatema Begum',
    nameBn: 'ফাতেমা বেগম',
    age: 24,
    sex: 'female',
    ethnicity: 'South Asian (Bangladeshi)',
    appearance: '24-year-old young female with delicate features, holding hand subtly toward right temple, sensitive to light and loud noises.',
    appearanceBn: '২৪ বছর বয়সী তরুণী, মাথায় তীব্র দপদপানি ব্যথায় ক্লান্ত চোখ, আলো ও শব্দে অতিরিক্ত সংবেদনশীল।',
    clothing: 'Light maroon modest cotton dupatta/scarf over pastel kurta',
    clothingBn: 'হালকা খয়েরি ওড়না ও সুতি কামিজ',
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

  // ──────────────────────────────────────────────────────────────────────────
  // Character E: Older Male (Abdul Motin, 68y)
  // ──────────────────────────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────────────────────
  // Character F: Older Female (Rokeya Begum, 63y)
  // ──────────────────────────────────────────────────────────────────────────
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

export class PatientCharacterService {
  /**
   * Returns all available patient characters.
   */
  public static getAllCharacters(): PatientCharacter[] {
    return PATIENT_CHARACTERS;
  }

  /**
   * Retrieves a character by ID. Defaults to Nusrat Jahan (char_nusrat).
   */
  public static getCharacterById(characterId: string): PatientCharacter {
    const found = PATIENT_CHARACTERS.find((c) => c.characterId === characterId);
    return found || PATIENT_CHARACTERS[0];
  }

  /**
   * Intelligently links any PatientCase to the most clinically appropriate realistic character.
   */
  public static getCharacterForCase(patientCase: Partial<PatientCase>): PatientCharacter {
    if (!patientCase) return PATIENT_CHARACTERS[0];

    const name = (patientCase.patientName || '').toLowerCase();
    const gender = (patientCase.patientGender || patientCase.avatarGender || '').toLowerCase();
    const age = patientCase.patientAge || 40;
    const complaint = (patientCase.chiefComplaint || patientCase.title || '').toLowerCase();

    // 1. Direct character ID or name match
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

    // 2. Demographic Fallback matching: Gender + Age group
    const isFemale = gender.includes('female') || gender.includes('মহিলা') || gender.includes('woman');

    if (isFemale) {
      if (age < 32) return this.getCharacterById('char_fatema'); // Young female
      if (age >= 55) return this.getCharacterById('char_rokeya'); // Elderly female
      return this.getCharacterById('char_nusrat'); // Middle-aged female
    } else {
      if (age < 30) return this.getCharacterById('char_tanvir'); // Young male
      if (age >= 60) return this.getCharacterById('char_abdul'); // Elderly male
      return this.getCharacterById('char_rafiqul'); // Middle-aged male
    }
  }
}

export default PatientCharacterService;
