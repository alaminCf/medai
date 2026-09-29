import { ClinicalFact, ClinicalIntent, PatientCaseContext } from './types';

export class StructuredClinicalFactExtractor {
  /**
   * Extracts structured clinical facts from the patient's case profile.
   * Maps every clinical aspect into a normalized ClinicalFact with English and Bangla expressions.
   */
  public static extractFacts(caseContext: PatientCaseContext): Record<string, ClinicalFact> {
    const facts: Record<string, ClinicalFact> = {};
    const sym = caseContext.symptomDetails || '';
    const symLower = sym.toLowerCase();

    // 1. CHIEF COMPLAINT
    const cc = caseContext.chiefComplaint;
    facts['chief_complaint'] = {
      factId: 'chief_complaint',
      category: 'CHIEF_COMPLAINT',
      name: 'Chief Complaint',
      valueEn: cc,
      valueBn: `আমার প্রধান সমস্যা হলো ${cc}`,
      synonyms: ['main complaint', 'problem', 'reason for visit', 'সমস্যা', 'কষ্ট'],
      importance: 'critical',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 2. ONSET & DURATION
    // Extract onset phrase from symptom details (e.g. "for 3 days", "started 2 hours ago", "yesterday morning")
    let onsetEn = 'It started about 2 to 3 days ago.';
    let onsetBn = 'এটা প্রায় ২ থেকে ৩ দিন আগে শুরু হয়েছে।';

    const onsetMatch = sym.match(/(started\s+[^.]+|(?:for|since)\s+\d+\s*(?:hours|days|weeks|months)[^.]*)/i);
    if (onsetMatch) {
      onsetEn = onsetMatch[0].trim();
      if (!onsetEn.endsWith('.')) onsetEn += '.';
      // Generate Bangla equivalent
      if (/hour/i.test(onsetEn)) {
        const num = onsetEn.match(/\d+/)?.[0] || '২';
        onsetBn = `এটা প্রায় ${num} ঘণ্টা আগে শুরু হয়েছে।`;
      } else if (/day/i.test(onsetEn)) {
        const num = onsetEn.match(/\d+/)?.[0] || '২-৩';
        onsetBn = `এটা প্রায় ${num} দিন আগে থেকে শুরু হয়েছে।`;
      } else if (/yesterday/i.test(onsetEn)) {
        onsetBn = 'এটা গতকাল থেকে শুরু হয়েছে।';
      }
    }

    facts['onset'] = {
      factId: 'onset',
      category: 'ONSET',
      name: 'Symptom Onset',
      valueEn: onsetEn,
      valueBn: onsetBn,
      synonyms: ['start', 'when', 'began', 'শুরু', 'কখন থেকে'],
      importance: 'critical',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['duration'] = {
      factId: 'duration',
      category: 'DURATION',
      name: 'Symptom Duration',
      valueEn: onsetEn,
      valueBn: onsetBn,
      synonyms: ['how long', 'duration', 'time', 'কতক্ষণ', 'কতদিন'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 3. LOCATION & SITE
    let locationEn = 'It is mainly in my chest area.';
    let locationBn = 'এটা মূলত আমার বুকের মাঝখানে অনুভূত হয়।';

    if (symLower.includes('central chest') || symLower.includes('middle of chest')) {
      locationEn = "It's mainly right in the center of my chest.";
      locationBn = 'ব্যথাটা বুকের ঠিক মাঝখানে, বুকের খাঁচার পেছনে অনুভূত হয়।';
    } else if (symLower.includes('periumbilical') || symLower.includes('navel') || symLower.includes('right lower belly') || symLower.includes('rif')) {
      locationEn = "It started around my belly button, but now it has moved down to the lower right side of my stomach.";
      locationBn = 'প্রথমে নাভির চারপাশে ছিল, এখন পেটের ডানপাশের নিচের দিকে নেমে এসেছে।';
    } else if (symLower.includes('right-sided') || symLower.includes('unilateral')) {
      locationEn = "It's on the right side of my head, around the temple.";
      locationBn = 'এটা মূলত মাথার ডানপাশে, কানের ওপরের অংশে তীব্রভাবে অনুভূত হয়।';
    } else if (symLower.includes('epigastric') || symLower.includes('upper belly')) {
      locationEn = "It's right in the upper middle part of my stomach.";
      locationBn = 'ব্যথাটা পেটের ওপরের অংশে, ঠিক বুকের নিচে অনুভূত হয়।';
    }

    facts['location'] = {
      factId: 'location',
      category: 'LOCATION',
      name: 'Pain Location',
      valueEn: locationEn,
      valueBn: locationBn,
      synonyms: ['site', 'where', 'spot', 'কোথায়', 'জায়গা'],
      importance: 'critical',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 4. CHARACTER / QUALITY
    let characterEn = "It feels like an uncomfortable pressure and tight sensation.";
    let characterBn = 'এটা একটা ভারী চাপের মতো লাগে, যেন বুকটা চেপে ধরে আছে।';

    if (symLower.includes('pressure') || symLower.includes('tightness') || symLower.includes('heaviness')) {
      characterEn = "It feels like a heavy pressure or squeezing sensation, like something is sitting on my chest.";
      characterBn = 'মনে হচ্ছে বুকের ওপর ভারী কিছু বসে আছে, চেপে ধরার মতো এক অসহ্য অনুভূতি।';
    } else if (symLower.includes('sharp') || symLower.includes('stabbing')) {
      characterEn = "It's a sharp, piercing pain that hurts with every movement.";
      characterBn = 'খুব ধারালো ও তীব্র খোঁচা মারার মতো ব্যথা।';
    } else if (symLower.includes('throbbing') || symLower.includes('pulsing')) {
      characterEn = "It's a throbbing, pounding pain, like a heartbeat inside my head.";
      characterBn = 'মাথার ভেতরে দপদপ করে টনটন করা তীব্র ব্যথা।';
    } else if (symLower.includes('burning') || symLower.includes('heartburn')) {
      characterEn = "It's a burning discomfort that rises upward.";
      characterBn = 'বুকের ভেতরে জ্বালাপোড়ার মতো কষ্ট হচ্ছে।';
    }

    facts['character'] = {
      factId: 'character',
      category: 'CHARACTER',
      name: 'Pain Character',
      valueEn: characterEn,
      valueBn: characterBn,
      synonyms: ['type', 'feel like', 'quality', 'কেমন অনুভূতি', 'প্রকৃতি'],
      importance: 'critical',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 5. SEVERITY
    let severityEn = "On a scale of 1 to 10, I would rate it around a 7.";
    let severityBn = '১০ এর স্কেলে বলতে গেলে এটা প্রায় ৭ এর মতো তীব্র।';

    if (symLower.includes('severe') || symLower.includes('8') || symLower.includes('9')) {
      severityEn = "It is very severe, at least an 8 out of 10 at its worst.";
      severityBn = '১০ এর স্কেলে এটা প্রায় ৮ বা ৯ এর মতো তীব্র, খুবই অসহ্য।';
    } else if (symLower.includes('mild')) {
      severityEn = "It is around a 4 or 5 out of 10, uncomfortable but manageable.";
      severityBn = '১০ এর স্কেলে ৪ বা ৫ এর মতো হবে ডাক্তার সাহেব।';
    }

    facts['severity'] = {
      factId: 'severity',
      category: 'SEVERITY',
      name: 'Pain Severity',
      valueEn: severityEn,
      valueBn: severityBn,
      synonyms: ['scale', 'how bad', 'intensity', 'মাত্রা', 'তীব্রতা'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 6. RADIATION
    let radiationEn = "No, it doesn't seem to spread anywhere else.";
    let radiationBn = 'না, ব্যথাটা অন্য কোথাও ছড়িয়ে পড়ছে না।';

    if (symLower.includes('left arm') || symLower.includes('arm')) {
      radiationEn = "Yes, it spreads down my left arm and sometimes toward my neck.";
      radiationBn = 'জি ডাক্তার সাহেব, ব্যথাটা বাম হাত এবং কখনো কখনো ঘাড়ের দিকে ছড়িয়ে পড়ে।';
    } else if (symLower.includes('jaw') || symLower.includes('neck')) {
      radiationEn = "Yes, it radiates up towards my jaw and neck.";
      radiationBn = 'জি, এটা ওপরের দিকে চোয়াল ও ঘাড়ের কাছে ছড়িয়ে যায়।';
    } else if (symLower.includes('back')) {
      radiationEn = "Yes, it travels straight through to my back.";
      radiationBn = 'জি, ব্যথাটা পিঠের দিকে ছড়িয়ে যায়।';
    }

    facts['radiation'] = {
      factId: 'radiation',
      category: 'RADIATION',
      name: 'Pain Radiation',
      valueEn: radiationEn,
      valueBn: radiationBn,
      synonyms: ['spread', 'move', 'travel', 'ছড়ায়', 'অন্য জায়গায় যায়'],
      importance: 'critical',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 7. AGGRAVATING FACTORS
    let aggEn = "It gets worse whenever I walk fast or exert myself physically.";
    let aggBn = 'হাঁটাচলা করলে বা একটু পরিশ্রম করলেই কষ্টটা বেড়ে যায়।';

    if (symLower.includes('exertion') || symLower.includes('walking') || symLower.includes('stairs')) {
      aggEn = "It definitely gets worse when I walk, climb stairs, or exert myself.";
      aggBn = 'হাঁটলে বা সিঁড়ি দিয়ে ওঠার মতো পরিশ্রম করলেই কষ্টটা বেড়ে যায়।';
    } else if (symLower.includes('coughing') || symLower.includes('movement')) {
      aggEn = "Any sudden movement, coughing, or walking makes it much worse.";
      aggBn = 'কাশি দিলে বা একটু নড়াচড়া করলেই ব্যথা তীব্র হয়ে ওঠে।';
    } else if (symLower.includes('light') || symLower.includes('sound')) {
      aggEn = "Bright lights and loud sounds make the headache unbearable.";
      aggBn = 'উজ্জ্বল আলো বা জোরে শব্দ শুনলে ব্যথা সহ্য করা যায় না।';
    }

    facts['aggravating_factors'] = {
      factId: 'aggravating_factors',
      category: 'AGGRAVATING_FACTORS',
      name: 'Aggravating Factors',
      valueEn: aggEn,
      valueBn: aggBn,
      synonyms: ['worse with', 'triggers', 'কিসে বাড়ে', 'বাড়ার কারণ'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 8. RELIEVING FACTORS
    let relEn = "It eases up slightly when I stop and rest.";
    let relBn = 'একটু বিশ্রাম নিয়ে বসে থাকলে কষ্টটা কিছুটা কমে আসে।';

    if (symLower.includes('rest')) {
      relEn = "Rest definitely helps — when I sit down and rest quietly, it improves after a few minutes.";
      relBn = 'বিশ্রাম নিলে আরাম লাগে — বসে একটু জিরিয়ে নিলে কিছুক্ষণ পর কমে।';
    } else if (symLower.includes('dark') || symLower.includes('quiet')) {
      relEn = "Lying down in a dark, quiet room gives me some relief.";
      relBn = 'অন্ধকার ও শান্ত ঘরে শুয়ে থাকলে কিছুটা ভালো লাগে।';
    }

    facts['relieving_factors'] = {
      factId: 'relieving_factors',
      category: 'RELIEVING_FACTORS',
      name: 'Relieving Factors',
      valueEn: relEn,
      valueBn: relBn,
      synonyms: ['better with', 'relieves', 'কিসে কমে', 'উপশম'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 9. TIMING & FREQUENCY
    let timingEn = "It comes on and off, especially during exertion, lasting around 10 to 15 minutes each time.";
    let timingBn = 'এটা মূলত কাজের সময় আসে, প্রায় ১০-১৫ মিনিট স্থায়ী হয়ে আবার কিছুটা কমে।';

    if (symLower.includes('constant')) {
      timingEn = "It is pretty much constant now, it hasn't really gone away since it peaked.";
      timingBn = 'ব্যথাটা এখন একটানা লেগেই আছে, একদম থামছে না।';
    }

    facts['timing'] = {
      factId: 'timing',
      category: 'TIMING',
      name: 'Timing & Frequency',
      valueEn: timingEn,
      valueBn: timingBn,
      synonyms: ['constant', 'intermittent', 'comes and goes', 'সময়', 'কতক্ষণ থাকে'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 10. ASSOCIATED SYMPTOMS (General)
    let assocEn = "I've also noticed feeling a bit sweaty and short of breath.";
    let assocBn = 'বুকের ব্যথার সাথে সাথে শরীর ঘেমে যায় এবং একটু শ্বাসকষ্ট অনুভূত হয়।';

    if (symLower.includes('sweat') && symLower.includes('breath')) {
      assocEn = "Yes, I broke into cold sweats and felt short of breath alongside the chest discomfort.";
      assocBn = 'জি ডাক্তার সাহেব, বুক ব্যথার সাথে সাথে অতিরিক্ত ঘাম হচ্ছিল আর শ্বাস নিতে কষ্ট হচ্ছিল।';
    } else if (symLower.includes('nausea') || symLower.includes('vomit')) {
      assocEn = "Yes, I have felt nauseous and lost my appetite completely.";
      assocBn = 'জি, আমার গা গুলিয়ে বমি বমি ভাব হচ্ছে এবং খাওয়ার রুচি একদম নেই।';
    }

    facts['associated_symptoms'] = {
      factId: 'associated_symptoms',
      category: 'ASSOCIATED_SYMPTOMS',
      name: 'Associated Symptoms',
      valueEn: assocEn,
      valueBn: assocBn,
      synonyms: ['other symptoms', 'with it', 'সাথে আর কি', 'অন্যান্য উপসর্গ'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 11. REVIEW OF SYSTEMS (Breathing, Fever, Cough, Syncope, Palpitation)
    // Breathing
    const hasDyspnea = symLower.includes('shortness of breath') || symLower.includes('breath') || symLower.includes('dyspnea');
    facts['breathing'] = {
      factId: 'breathing',
      category: 'BREATHING',
      name: 'Breathing / Dyspnea',
      valueEn: hasDyspnea
        ? "Yes, I feel somewhat breathless, especially when moving around."
        : "No, my breathing is quite normal, I don't feel short of breath.",
      valueBn: hasDyspnea
        ? "জি ডাক্তার সাহেব, একটু হাঁটলেই কেমন যেন দম আটকে আসে এবং শ্বাসকষ্ট হয়।"
        : "না ডাক্তার সাহেব, শ্বাসকষ্টের কোনো সমস্যা নেই।",
      synonyms: ['shortness of breath', 'breathless', 'শ্বাসকষ্ট'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // Fever
    const hasFever = symLower.includes('fever') && !symLower.includes('no fever');
    facts['fever'] = {
      factId: 'fever',
      category: 'FEVER',
      name: 'Fever Assessment',
      valueEn: hasFever
        ? "Yes, I've had a fever and chills for the past couple of days."
        : "No, I haven't had any fever or chills.",
      valueBn: hasFever
        ? "জি, শরীর বেশ গরম এবং জ্বর ও কাঁপুনি আছে।"
        : "না ডাক্তার সাহেব, আমার কোনো জ্বর আসেনি।",
      synonyms: ['fever', 'temperature', 'chills', 'জ্বর', 'গা গরম'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // Cough
    const hasCough = symLower.includes('cough') && !symLower.includes('no cough');
    facts['cough'] = {
      factId: 'cough',
      category: 'COUGH',
      name: 'Cough Assessment',
      valueEn: hasCough
        ? "Yes, I have had a cough."
        : "No, I don't have any cough.",
      valueBn: hasCough
        ? "জি, আমার কিছুটা কাশি হচ্ছে।"
        : "না ডাক্তার সাহেব, আমার কাশি হচ্ছে না।",
      synonyms: ['cough', 'phlegm', 'কাশি', 'কফ'],
      importance: 'supporting',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // Palpitations
    const hasPalp = symLower.includes('palpitation') || symLower.includes('pounding');
    facts['palpitation'] = {
      factId: 'palpitation',
      category: 'PALPITATION',
      name: 'Palpitations Assessment',
      valueEn: hasPalp
        ? "Yes, my heart feels like it's racing fast inside my chest."
        : "No, I haven't noticed my heart racing irregularly, just this heavy pressure.",
      valueBn: hasPalp
        ? "জি ডাক্তার সাহেব, মাঝে মাঝে বুকটা ধড়ফড় করে ওঠে।"
        : "না, বুক ধড়ফড়ের তেমন কোনো অনুভূতি হয়নি।",
      synonyms: ['palpitation', 'racing heart', 'বুক ধড়ফড়'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // Syncope / Dizziness
    const hasSyncope = symLower.includes('syncope') || symLower.includes('fainted') || symLower.includes('blackout');
    facts['syncope'] = {
      factId: 'syncope',
      category: 'SYNCOPE',
      name: 'Syncope Assessment',
      valueEn: hasSyncope
        ? "Yes, I briefly blacked out."
        : "No, I haven't passed out or fainted at all.",
      valueBn: hasSyncope
        ? "জি, আমি কিছুক্ষণের জন্য চোখে অন্ধকার দেখে অচেতন হয়ে পড়েছিলাম।"
        : "না ডাক্তার সাহেব, আমি অজ্ঞান বা বেহুঁশ হইনি কখনো।",
      synonyms: ['faint', 'pass out', 'blackout', 'অজ্ঞান'],
      importance: 'critical',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 12. PAST MEDICAL HISTORY
    const pmh = caseContext.medicalHistory || "I have been generally healthy with no major previous hospital stays.";
    facts['past_medical_history'] = {
      factId: 'past_medical_history',
      category: 'PAST_MEDICAL_HISTORY',
      name: 'Past Medical History',
      valueEn: pmh,
      valueBn: `অতীতের চিকিৎসার ব্যাপারে বলতে গেলে: ${pmh}`,
      synonyms: ['medical history', 'past illness', 'chronic conditions', 'আগের রোগ', 'অতীতের ইতিহাস'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 13. MEDICATION HISTORY
    const meds = caseContext.medicationHistory || "I don't take any regular prescribed medicines, just occasional paracetamol.";
    facts['medication'] = {
      factId: 'medication',
      category: 'MEDICATION',
      name: 'Medication History',
      valueEn: meds,
      valueBn: `ওষুধের ক্ষেত্রে: ${meds}`,
      synonyms: ['medicines', 'drugs', 'pills', 'tablets', 'ওষুধ', 'ঔষধ'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 14. ALLERGY HISTORY
    const allergies = caseContext.allergyHistory || "I have no known allergies to any medicines or food.";
    facts['allergy'] = {
      factId: 'allergy',
      category: 'ALLERGY',
      name: 'Allergy History',
      valueEn: allergies,
      valueBn: `অ্যালার্জির বিষয়ে: ${allergies}`,
      synonyms: ['allergies', 'allergic', 'reactions', 'অ্যালার্জি', 'এলার্জি'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 15. FAMILY HISTORY
    const fam = caseContext.familyHistory || "There are no major hereditary illnesses in my family that I know of.";
    facts['family_history'] = {
      factId: 'family_history',
      category: 'FAMILY_HISTORY',
      name: 'Family History',
      valueEn: fam,
      valueBn: `পারিবারিক ইতিহাসের ক্ষেত্রে: ${fam}`,
      synonyms: ['family', 'parents', 'father', 'mother', 'পরিবার', 'বংশগত'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 16. SOCIAL HISTORY / SMOKING / ALCOHOL
    const soc = caseContext.socialHistory || "I work full time, do not smoke, and live a normal lifestyle.";
    facts['social_history'] = {
      factId: 'social_history',
      category: 'SOCIAL_HISTORY',
      name: 'Social History',
      valueEn: soc,
      valueBn: `ব্যক্তিগত ও জীবনযাপনের ব্যাপারে: ${soc}`,
      synonyms: ['social', 'lifestyle', 'work', 'job', 'পেশা', 'চাকরি'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    const isSmoker = soc.toLowerCase().includes('smoke') || soc.toLowerCase().includes('cigarette') || soc.toLowerCase().includes('pack');
    facts['smoking'] = {
      factId: 'smoking',
      category: 'SMOKING',
      name: 'Smoking History',
      valueEn: isSmoker ? soc : "No, I do not smoke cigarettes or use tobacco.",
      valueBn: isSmoker ? soc : "না ডাক্তার সাহেব, আমি ধূমপান বা বিড়ি-সিগারেট খাই না।",
      synonyms: ['smoke', 'cigarettes', 'tobacco', 'ধূমপান', 'সিগারেট'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    const drinksAlcohol = soc.toLowerCase().includes('alcohol') || soc.toLowerCase().includes('drink');
    facts['alcohol'] = {
      factId: 'alcohol',
      category: 'ALCOHOL',
      name: 'Alcohol History',
      valueEn: drinksAlcohol ? soc : "No, I do not drink alcohol.",
      valueBn: drinksAlcohol ? soc : "না, আমি মদ্যপান করি না।",
      synonyms: ['alcohol', 'drinks', 'মদ্যপান'],
      importance: 'supporting',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 17. PATIENT CONCERNS (ICE)
    facts['patient_concern'] = {
      factId: 'patient_concern',
      category: 'PATIENT_CONCERN',
      name: 'Patient Ideas & Concerns',
      valueEn: "I'm honestly really worried that this might be something serious with my heart, like a heart attack.",
      valueBn: "ডাক্তার সাহেব, আমি খুব দুশ্চিন্তায় আছি এটা হার্টের কোনো মারাত্মক জটিল রোগ কি না।",
      synonyms: ['worried', 'concerns', 'fears', 'দুশ্চিন্তা', 'ভয়'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    return facts;
  }
}
