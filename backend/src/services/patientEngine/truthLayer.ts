import { ClinicalIntent, LanguageMode, PatientCaseContext } from './types';

// ────────────────────────────────────────────────────────────────────────────
// Structured Patient Truth Layer (Authoritative Clinical Fact Store)
// ────────────────────────────────────────────────────────────────────────────

export interface PatientTruthLayer {
  demographics: {
    name: string;
    age: number;
    gender: string;
    occupation: string;
    maritalStatus: string;
    language: string;
  };
  chiefComplaint: {
    text: string;
    duration: string;
  };
  hpi: {
    onset: string;
    onsetBn: string;
    duration: string;
    durationBn: string;
    location: string;
    locationBn: string;
    character: string;
    characterBn: string;
    severity: string;
    severityBn: string;
    radiation: string;
    radiationBn: string;
    aggravatingFactors: string[];
    aggravatingFactorsBn: string[];
    relievingFactors: string[];
    relievingFactorsBn: string[];
    timing: string;
    timingBn: string;
    progression: string;
    progressionBn: string;
  };
  associatedSymptoms: {
    fever: { present: boolean; descriptionEn: string; descriptionBn: string };
    nausea: { present: boolean; descriptionEn: string; descriptionBn: string };
    vomiting: { present: boolean; descriptionEn: string; descriptionBn: string };
    bowelChanges: { present: boolean; descriptionEn: string; descriptionBn: string };
    urinarySymptoms: { present: boolean; descriptionEn: string; descriptionBn: string };
    appetite: { descriptionEn: string; descriptionBn: string };
    cough: { present: boolean; descriptionEn: string; descriptionBn: string };
    dyspnea: { present: boolean; descriptionEn: string; descriptionBn: string };
    palpitation: { present: boolean; descriptionEn: string; descriptionBn: string };
    syncope: { present: boolean; descriptionEn: string; descriptionBn: string };
    dizziness: { present: boolean; descriptionEn: string; descriptionBn: string };
    ocular: { present: boolean; descriptionEn: string; descriptionBn: string };
    phonophobia: { present: boolean; descriptionEn: string; descriptionBn: string };
    neckStiffness: { present: boolean; descriptionEn: string; descriptionBn: string };
    trauma: { present: boolean; descriptionEn: string; descriptionBn: string };
    neurologicalDeficit: { present: boolean; descriptionEn: string; descriptionBn: string };
  };
  pastMedicalHistory: {
    descriptionEn: string;
    descriptionBn: string;
    conditions: string[];
  };
  pastSurgicalHistory: {
    hasSurgery: boolean;
    descriptionEn: string;
    descriptionBn: string;
  };
  medications: {
    takesMedicine: boolean;
    descriptionEn: string;
    descriptionBn: string;
  };
  allergies: {
    hasAllergies: boolean;
    descriptionEn: string;
    descriptionBn: string;
  };
  familyHistory: {
    hasFamilyIllness: boolean;
    descriptionEn: string;
    descriptionBn: string;
  };
  socialHistory: {
    occupation: string;
    smoking: { isSmoker: boolean; detailsEn: string; detailsBn: string };
    alcohol: { drinksAlcohol: boolean; detailsEn: string; detailsBn: string };
    diet: { detailsEn: string; detailsBn: string };
    sleep: { detailsEn: string; detailsBn: string };
    livingSituation: { detailsEn: string; detailsBn: string };
  };
  systemicReview: {
    menstrualHistory?: { detailsEn: string; detailsBn: string };
    previousEpisodes: { hadPrevious: boolean; detailsEn: string; detailsBn: string };
    treatmentHistory: { takenPriorMedicine: boolean; detailsEn: string; detailsBn: string };
  };
  patientConcerns: {
    concernEn: string;
    concernBn: string;
    expectationEn: string;
    expectationBn: string;
  };
  hiddenClinicalData: {
    hiddenDiagnosis?: string;
    redFlags?: string;
  };
}

export class TruthLayerBuilder {
  /**
   * Builds authoritative PatientTruthLayer from DB PatientCaseContext
   */
  public static build(caseContext: PatientCaseContext): PatientTruthLayer {
    const sym = (caseContext.symptomDetails || '').toLowerCase();
    const soc = (caseContext.socialHistory || '').toLowerCase();
    const med = (caseContext.medicalHistory || '').toLowerCase();
    const rx = (caseContext.medicationHistory || '').toLowerCase();
    const al = (caseContext.allergyHistory || '').toLowerCase();
    const fam = (caseContext.familyHistory || '').toLowerCase();
    const cc = caseContext.chiefComplaint || '';

    // 1. Demographics
    const name = caseContext.patientName || 'Patient';
    const age = Number(caseContext.patientAge) || 45;
    const gender = caseContext.patientGender || 'Male';

    let occupation = 'Service Holder / Worker';
    if (soc.includes('businessman') || soc.includes('business')) occupation = 'Businessman';
    else if (soc.includes('teacher')) occupation = 'Teacher';
    else if (soc.includes('student')) occupation = 'Student';
    else if (soc.includes('software engineer') || soc.includes('engineer')) occupation = 'Software Engineer';
    else if (soc.includes('accountant')) occupation = 'Accountant';
    else if (soc.includes('retired')) occupation = 'Retired Officer';
    else if (soc.includes('driver')) occupation = 'Driver';
    else if (soc.includes('housewife') || soc.includes('homemaker')) occupation = 'Homemaker';

    let maritalStatus = 'Unspecified';
    if (soc.includes('married')) maritalStatus = 'Married';
    else if (soc.includes('single') || soc.includes('unmarried')) maritalStatus = 'Single';
    else if (soc.includes('widow')) maritalStatus = 'Widowed';

    // 2. Duration & Onset (Supports Bengali Numerals & Units)
    let durationEn = 'for the past few days';
    let durationBn = 'কয়েকদিন ধরে';

    const bnToEnDigits = (s: string) =>
      s.replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
    const enToBnDigits = (s: string | number) =>
      String(s).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'.charAt(parseInt(d, 10)));

    const combinedText = (sym + ' ' + cc);
    const normalizedDigits = bnToEnDigits(combinedText);
    const durMatch = normalizedDigits.match(/(\d+)\s*(days?|hours?|weeks?|months?|দিন|ঘণ্টা|ঘন্টা|সপ্তাহ|মাস)/i);
    if (durMatch) {
      const num = durMatch[1];
      const unit = durMatch[2].toLowerCase();
      const numBn = enToBnDigits(num);
      if (unit.startsWith('hour') || unit.includes('ঘণ্টা') || unit.includes('ঘন্টা')) {
        durationEn = `${num} hours`;
        durationBn = `${numBn} ঘণ্টা`;
      } else if (unit.startsWith('day') || unit.includes('দিন')) {
        durationEn = `${num} days`;
        durationBn = `${numBn} দিন`;
      } else if (unit.startsWith('week') || unit.includes('সপ্তাহ')) {
        durationEn = `${num} weeks`;
        durationBn = `${numBn} সপ্তাহ`;
      } else if (unit.startsWith('month') || unit.includes('মাস')) {
        durationEn = `${num} months`;
        durationBn = `${numBn} মাস`;
      }
    }

    let onsetEn = `Started ${durationEn} ago.`;
    let onsetBn = `এটা প্রায় ${durationBn} আগে শুরু হয়েছে।`;
    if (sym.includes('yesterday') || combinedText.includes('গতকাল')) {
      onsetEn = 'Started yesterday.';
      onsetBn = 'এটা গতকাল থেকে শুরু হয়েছে।';
    } else if (sym.includes('sudden') || combinedText.includes('হঠাৎ')) {
      onsetEn = 'It started suddenly.';
      onsetBn = 'হঠাৎ করেই এটা তীব্রভাবে শুরু হয়েছিল।';
    }

    // 3. Location
    const lowerCombined = (sym + ' ' + cc).toLowerCase();
    let locationEn = 'In the affected area.';
    let locationBn = 'কষ্টের জায়গায় অনুভূত হচ্ছে।';
    if (
      lowerCombined.includes('চোখের পেছনে') ||
      lowerCombined.includes('সারা শরীরে') ||
      lowerCombined.includes('behind my eyes') ||
      lowerCombined.includes('body ache') ||
      lowerCombined.includes('dengue') ||
      lowerCombined.includes('myalgia') ||
      lowerCombined.includes('bone ache') ||
      lowerCombined.includes('joint pain')
    ) {
      locationEn = 'Intense pain all over my body, particularly severe aching behind my eyes and deep in my bones.';
      locationBn = 'সারা শরীরে তীব্র ব্যথা এবং বিশেষ করে দুই চোখের পেছনের দিকে অসহ্য যন্ত্রণা হচ্ছে।';
    } else
    if (sym.includes('central chest') || sym.includes('center of my chest') || sym.includes('retrosternal') || cc.toLowerCase().includes('chest')) {
      locationEn = 'Right in the center of my chest, behind the breastbone.';
      locationBn = 'বুকের ঠিক মাঝখানে, খাঁচার পেছনে চাপ অনুভব করছি।';
    } else if (sym.includes('right lower') || sym.includes('rif') || sym.includes('periumbilical')) {
      locationEn = 'It started around my belly button and has now moved to the lower right side of my abdomen.';
      locationBn = 'প্রথমে নাভির চারপাশে ছিল, এখন পেটের ডানপাশের নিচের দিকে নেমে এসেছে।';
    } else if (sym.includes('right upper') || sym.includes('ruq') || sym.includes('after fatty meals')) {
      locationEn = 'In the upper right side of my belly, under my ribs.';
      locationBn = 'পেটের ডানপাশের ওপরের অংশে, পাঁজরের ঠিক নিচে।';
    } else if (sym.includes('epigastric')) {
      locationEn = 'In the upper middle part of my stomach, just below the ribs.';
      locationBn = 'পেটের ওপরের মাঝের অংশে, ঠিক বুকের খাঁচার নিচে।';
    } else if (sym.includes('unilateral') || sym.includes('right-sided') || sym.includes('left-sided') || cc.toLowerCase().includes('headache')) {
      const side = sym.includes('left') ? 'বাম' : 'ডান';
      locationEn = `Mainly on the ${side === 'বাম' ? 'left' : 'right'} side of my head, around the temple and above my ear. It is not on top of my head or the back of my head.`;
      locationBn = `মাথার ${side}পাশে, বিশেষ করে কানের ওপরে এবং রগের কাছে বেশি ব্যথাটা হচ্ছে ডাক্তার। মাথার উপরে বা পেছনের দিকে নয়।`;
    }

    // 4. Character
    let characterEn = 'It feels uncomfortable and heavy.';
    let characterBn = 'এটা বেশ অস্বস্তিকর এবং ভারী অনুভূতি।';
    if (
      lowerCombined.includes('অসহ্য যন্ত্রণা') ||
      lowerCombined.includes('যন্ত্রণা') ||
      lowerCombined.includes('breakbone') ||
      lowerCombined.includes('dengue') ||
      lowerCombined.includes('body ache') ||
      lowerCombined.includes('myalgia') ||
      lowerCombined.includes('bone ache') ||
      lowerCombined.includes('arthralgia')
    ) {
      characterEn = 'Severe agonizing pain deep in my muscles and joints, as if my bones are breaking.';
      characterBn = 'সারা শরীরের মাংসপেশি ও হাড়ে তীব্র কামড়ানো অসহ্য যন্ত্রণা, যেন ভেঙে পড়ার মতো কষ্ট।';
    } else
    if (sym.includes('pressure') || sym.includes('tightness') || sym.includes('crushing') || sym.includes('squeezing') || sym.includes('heavy')) {
      characterEn = 'It feels like a heavy pressure or tight squeezing, as if something heavy is sitting on my chest.';
      characterBn = 'মনে হচ্ছে বুকের ওপর ভারী কিছু বসে আছে, চেপে ধরার মতো এক অসহ্য অনুভূতি।';
    } else if (sym.includes('colicky') || sym.includes('cramping')) {
      characterEn = 'It comes in waves of severe cramping and gripping pain.';
      characterBn = 'মোচড় দিয়ে তীব্র ব্যথার ঢেউয়ের মতো আসে।';
    } else if (sym.includes('throbbing') || sym.includes('pulsing') || sym.includes('pulsatile')) {
      characterEn = 'It is a throbbing, pounding pain that pulses like a heartbeat.';
      characterBn = 'মাথার ভেতরে দপদপ করে টনটন করা তীব্র ব্যথা।';
    } else if (sym.includes('sharp') || sym.includes('stabbing') || sym.includes('piercing')) {
      characterEn = 'It is a sharp, piercing pain that hurts with every movement.';
      characterBn = 'খুব ধারালো ও তীব্র খোঁচা মারার মতো তীক্ষ্ণ ব্যথা।';
    } else if (sym.includes('burning') || sym.includes('heartburn')) {
      characterEn = 'It is a burning discomfort that rises upward.';
      characterBn = 'বুকের বা পেটের ভেতর জ্বালাপোড়ার মতো কষ্ট।';
    }

    // 5. Severity
    let severityEn = 'Around 6 or 7 out of 10.';
    let severityBn = '১০ এর মধ্যে প্রায় ৬ বা ৭ হবে ডাক্তার।';
    const sevMatch = sym.match(/(\d+)\s*\/\s*10/);
    if (sevMatch) {
      severityEn = `Around ${sevMatch[1]} out of 10.`;
      severityBn = `১০ এর স্কেলে প্রায় ${sevMatch[1]} এর মতো হবে।`;
    }

    // 6. Radiation
    let radiationEn = 'No, it does not spread anywhere else.';
    let radiationBn = 'না ডাক্তার, এটা অন্য কোথাও ছড়ায় না, এক জায়গাতেই থাকে।';
    if (sym.includes('radiates to left arm') || sym.includes('radiates to arm') || sym.includes('shoulder and jaw')) {
      radiationEn = 'Yes, the pain spreads down my left arm and up towards my shoulder and jaw.';
      radiationBn = 'জি ডাক্তার, ব্যথাটা আমার বাম হাত দিয়ে নেমে যায় এবং কাঁধ ও চোয়ালের দিকেও ছড়ায়।';
    } else if (sym.includes('radiates to right shoulder') || sym.includes('shoulder tip')) {
      radiationEn = 'Yes, it shoots up towards my right shoulder tip and back.';
      radiationBn = 'জি ডাক্তার, ব্যথাটা পেছনের দিকে এবং ডান কাঁধের মাথায় ছড়িয়ে পড়ে।';
    } else if (sym.includes('radiates to back')) {
      radiationEn = 'Yes, it shoots straight through to my back.';
      radiationBn = 'জি ডাক্তার, এটা সোজা পিঠের দিকে চলে যায়।';
    }

    // 7. Aggravating & Relieving
    const aggravatingFactors: string[] = [];
    const aggravatingFactorsBn: string[] = [];
    const relievingFactors: string[] = [];
    const relievingFactorsBn: string[] = [];
    if (sym.includes('exertion') || sym.includes('walking') || sym.includes('movement')) {
      aggravatingFactors.push('Exertion and physical activity make it worse.');
      aggravatingFactorsBn.push('হাঁটাচলা বা শারীরিক পরিশ্রম করলে কষ্ট বেড়ে যায়।');
    }
    if (sym.includes('fatty') || sym.includes('food') || sym.includes('eating')) {
      aggravatingFactors.push('Eating rich or fatty meals triggers the pain.');
      aggravatingFactorsBn.push('ভারী বা তৈলাক্ত খাবার খেলে সমস্যা বাড়ে।');
    }
    if (sym.includes('light') || sym.includes('noise')) {
      aggravatingFactors.push('Bright lights and loud sounds make it unbearable.');
      aggravatingFactorsBn.push('আলো আর শব্দের মধ্যে থাকলে কষ্ট বাড়ে।');
    }
    if (sym.includes('rest')) {
      relievingFactors.push('Resting quietly helps ease it slightly.');
      relievingFactorsBn.push('একটু বিশ্রাম নিলে কিছুটা আরাম পাই।');
    }
    if (sym.includes('dark room') || sym.includes('sleep')) {
      relievingFactors.push('Lying down in a dark, quiet room helps.');
      relievingFactorsBn.push('অন্ধকার ঘরে চুপচাপ শুয়ে থাকলে কিছুটা ভালো লাগে।');
    }

    // 8. Associated Symptoms
    const hasFever = (sym.includes('fever') || cc.toLowerCase().includes('fever') || combinedText.includes('জ্বর') || combinedText.includes('জর')) && !sym.includes('no fever') && !sym.includes('জ্বর নেই');
    const hasNausea = sym.includes('nausea') && !sym.includes('no nausea');
    const hasVomiting = (sym.includes('vomiting') || sym.includes('vomit')) && !sym.includes('no vomiting');
    const hasDiarrhea = sym.includes('diarrhea') || sym.includes('loose stool');
    const hasConstipation = sym.includes('constipation');
    const hasDyspnea = (sym.includes('breath') || sym.includes('dyspnea') || sym.includes('shortness of breath')) && !sym.includes('no shortness of breath');
    const hasPalpitation = sym.includes('palpitation') || sym.includes('racing heart');
    const hasCough = sym.includes('cough') && !sym.includes('no cough');
    const hasSyncope = sym.includes('syncope') || sym.includes('fainted') || sym.includes('blackout');
    const hasOcular = (sym.includes('ocular') || sym.includes('eye') || sym.includes('scotoma') || sym.includes('photophobia') || sym.includes('retro-orbital') || combinedText.includes('চোখ') || combinedText.includes('দৃষ্টি') || combinedText.includes('চক্ষু')) && !sym.includes('no eye pain');
    const hasPhono = (sym.includes('phonophobia') || sym.includes('noise') || sym.includes('sound')) && !sym.includes('no phonophobia');
    const hasNeck = (sym.includes('stiff neck') || sym.includes('neck stiffness') || sym.includes('mening')) && !sym.includes('no neck stiffness') && !sym.includes('supple');
    const hasTrauma = (sym.includes('trauma') || sym.includes('fall') || sym.includes('injury') || sym.includes('accident')) && !sym.includes('no trauma') && !sym.includes('no injury');
    const hasNeuro = (sym.includes('weakness') || sym.includes('numbness') || sym.includes('slurred') || sym.includes('facial droop')) && !sym.includes('no weakness');

    // 9. Past Medical & Surgical
    const conditions: string[] = [];
    if (med.includes('hypertension') || med.includes('high blood pressure')) conditions.push('Hypertension');
    if (med.includes('diabetes')) conditions.push('Diabetes Mellitus');
    if (med.includes('asthma')) conditions.push('Asthma');
    if (med.includes('heart')) conditions.push('Heart Disease');

    let pmhEn = caseContext.medicalHistory || "I have generally been healthy without any major chronic illnesses.";
    let pmhBn = caseContext.medicalHistory ? `অতীতের চিকিৎসার ক্ষেত্রে: ${caseContext.medicalHistory}` : "না ডাক্তার সাহেব, অতীতে আমার কোনো বড় অসুখ বা সমস্যা ছিল না।";

    let surgEn = "No, I have never had any operations or surgeries in the past.";
    let surgBn = "না ডাক্তার, আমার আগে কখনো কোনো অপারেশন বা সার্জারি হয়নি।";
    if (med.includes('surgery') || med.includes('operation') || med.includes('appendectomy')) {
      surgEn = "Yes, I had a previous surgery in the past.";
      surgBn = "জি ডাক্তার, আমার আগে একবার অপারেশন হয়েছিল।";
    }

    // 10. Medications & Allergies
    const hasMeds = rx.length > 5 && !rx.includes('none') && !rx.includes('no regular');
    let medsEn = hasMeds ? caseContext.medicationHistory! : "I don't take any regular prescribed medicines, only occasional over-the-counter paracetamol when needed.";
    let medsBn = hasMeds ? `আমি নিয়মিত এই ওষুধগুলো খাই: ${caseContext.medicationHistory}` : "না ডাক্তার সাহেব, নিয়মিত কোনো প্রেসক্রিপশনের ওষুধ খাই না। খুব প্রয়োজন হলে শুধু প্যারাসিটামল খাই।";

    const hasAllergies = al.length > 5 && !al.includes('no known') && !al.includes('none');
    let alEn = hasAllergies ? caseContext.allergyHistory! : "No, I have no known allergies to any medicines or food.";
    let alBn = hasAllergies ? `আমার অ্যালার্জি আছে: ${caseContext.allergyHistory}` : "না ডাক্তার সাহেব, আমার জানা মতে কোনো ওষুধ বা খাবারে অ্যালার্জি নেই।";

    // 11. Family History
    const hasFam = fam.length > 5 && !fam.includes('no known') && !fam.includes('none');
    let famEn = hasFam ? caseContext.familyHistory! : "There are no major hereditary conditions or early heart problems in my family.";
    let famBn = hasFam ? `আমার পরিবারের বিষয়ে: ${caseContext.familyHistory}` : "না ডাক্তার, আমাদের পরিবারে এমন কোনো বড় বা বংশগত রোগ নেই।";

    // 12. Smoking & Alcohol
    const isSmoker = soc.includes('smoke') || soc.includes('cigarette') || soc.includes('pack');
    let smkEn = isSmoker ? caseContext.socialHistory! : "No, I do not smoke cigarettes or use tobacco.";
    let smkBn = isSmoker ? `জি ডাক্তার, আমি ধূমপান করি: ${caseContext.socialHistory}` : "না ডাক্তার সাহেব, আমি কখনো ধূমপান বা বিড়ি-সিগারেট খাই না।";

    const isDrinker = soc.includes('alcohol') || soc.includes('drink') || soc.includes('wine');
    let alcEn = isDrinker ? "Yes, I drink alcohol occasionally." : "No, I do not drink alcohol.";
    let alcBn = isDrinker ? "মাঝে মাঝে একটু মদ্যপান করা হয়।" : "না ডাক্তার, আমি মদ্যপান করি না।";

    // 13. Systemic Review: Bowel & Bladder
    let bowelEn = 'My bowel habits have been normal, no diarrhea or constipation.';
    let bowelBn = 'পায়খানা স্বাভাবিকই আছে ডাক্তার, কোনো পাতলা পায়খানা বা কোষ্ঠকাঠিন্য হয়নি।';
    if (hasDiarrhea) {
      bowelEn = 'Yes, I have been having loose watery stools for the past couple of days.';
      bowelBn = 'জি ডাক্তার, কদিন ধরে পাতলা পায়খানা হচ্ছে।';
    } else if (hasConstipation) {
      bowelEn = 'I have been severely constipated and have not passed stools regularly.';
      bowelBn = 'জি ডাক্তার, খুব কোষ্ঠকাঠিন্য হচ্ছে, পায়খানা ঠিকমতো পরিষ্কার হচ্ছে না।';
    }

    let urineEn = 'My urination is completely normal, no burning, pain, or difficulty.';
    let urineBn = 'প্রস্রাবে কোনো জ্বালাপোড়া বা কষ্ট নেই ডাক্তার, স্বাভাবিকভাবেই হচ্ছে।';
    if (sym.includes('burning') && sym.includes('urine')) {
      urineEn = 'Yes, I feel a severe burning pain when I pass urine.';
      urineBn = 'জি ডাক্তার, প্রস্রাব করার সময় খুব জ্বালাপোড়া ও কষ্ট হয়।';
    }

    return {
      demographics: {
        name,
        age,
        gender,
        occupation,
        maritalStatus,
        language: caseContext.language || 'en',
      },
      chiefComplaint: {
        text: cc,
        duration: durationEn,
      },
      hpi: {
        onset: onsetEn,
        onsetBn: onsetBn,
        duration: durationEn,
        durationBn: durationBn,
        location: locationEn,
        locationBn: locationBn,
        character: characterEn,
        characterBn: characterBn,
        severity: severityEn,
        severityBn: severityBn,
        radiation: radiationEn,
        radiationBn: radiationBn,
        aggravatingFactors,
        aggravatingFactorsBn,
        relievingFactors,
        relievingFactorsBn,
        timing: sym.includes('constant') ? 'It is constant throughout the day.' : 'It comes and goes in waves.',
        timingBn: sym.includes('constant') ? 'সারাদিনই একনাগাড়ে এই কষ্টটা থাকে।' : 'মাঝে মাঝে তীব্র হয়, আবার কিছুটা কমে যায়।',
        progression: sym.includes('worse') || sym.includes('progressive') ? 'It has been steadily getting worse.' : 'It has stayed about the same severity.',
        progressionBn: sym.includes('worse') || sym.includes('progressive') ? 'আস্তে আস্তে এটা দিন দিন খারাপের দিকেই যাচ্ছে।' : 'প্রথম থেকেই একই রকম আছে, কমছেও না বাড়ছেও না।',
      },
      associatedSymptoms: {
        fever: {
          present: hasFever,
          descriptionEn: hasFever ? "Yes, I've had a fever with chills." : "No, I haven't had any fever or chills.",
          descriptionBn: hasFever ? "জি ডাক্তার সাহেব, শরীর বেশ গরম আর জ্বর-কাঁপুনি হচ্ছে।" : "না ডাক্তার সাহেব, আমার কোনো জ্বর আসেনি।",
        },
        nausea: {
          present: hasNausea,
          descriptionEn: hasNausea ? "Yes, I feel nauseous and sick to my stomach." : "No, I haven't felt nauseous.",
          descriptionBn: hasNausea ? "জি ডাক্তার, সারাক্ষণ বমি বমি ভাব লাগছে।" : "না ডাক্তার, বমি বমি ভাব তেমন নেই।",
        },
        vomiting: {
          present: hasVomiting,
          descriptionEn: hasVomiting ? "Yes, I have vomited a few times." : "No, I haven't actually vomited.",
          descriptionBn: hasVomiting ? "জি ডাক্তার সাহেব, কয়েকবার বমি হয়েছে।" : "না ডাক্তার সাহেব, আমার বমি হয়নি।",
        },
        bowelChanges: {
          present: hasDiarrhea || hasConstipation,
          descriptionEn: bowelEn,
          descriptionBn: bowelBn,
        },
        urinarySymptoms: {
          present: sym.includes('burning') && sym.includes('urine'),
          descriptionEn: urineEn,
          descriptionBn: urineBn,
        },
        appetite: {
          descriptionEn: sym.includes('loss of appetite') || sym.includes('poor appetite')
            ? "I have completely lost my appetite and haven't felt like eating."
            : "My appetite is fairly normal.",
          descriptionBn: sym.includes('loss of appetite') || sym.includes('poor appetite')
            ? "খাবারে একদম রুচি নেই ডাক্তার, কিছুই খেতে ইচ্ছে করছে না।"
            : "খাবারের রুচি মোটামুটি স্বাভাবিকই আছে ডাক্তার।",
        },
        cough: {
          present: hasCough,
          descriptionEn: hasCough ? "Yes, I have had a bothersome cough." : "No, I do not have any cough.",
          descriptionBn: hasCough ? "জি ডাক্তার, কিছুটা কাশি হচ্ছে।" : "না ডাক্তার সাহেব, আমার কাশি নেই।",
        },
        dyspnea: {
          present: hasDyspnea,
          descriptionEn: hasDyspnea ? "Yes, I feel short of breath and find it hard to breathe." : "No, my breathing is fine, no shortness of breath.",
          descriptionBn: hasDyspnea ? "জি ডাক্তার, একটু হাঁটলেই দম আটকে আসে, শ্বাস নিতে কষ্ট হয়।" : "না ডাক্তার, শ্বাসকষ্টের কোনো সমস্যা নেই।",
        },
        palpitation: {
          present: hasPalpitation,
          descriptionEn: hasPalpitation ? "Yes, my heart feels like it is pounding or racing in my chest." : "No, I haven't noticed my heart racing irregularly.",
          descriptionBn: hasPalpitation ? "জি ডাক্তার সাহেব, মাঝে মাঝে বুকটা ধড়ফড় করে ওঠে।" : "না ডাক্তার, বুক ধড়ফড়ের তেমন কোনো অনুভূতি হয়নি।",
        },
        syncope: {
          present: hasSyncope,
          descriptionEn: hasSyncope ? "Yes, I briefly blacked out and collapsed." : "No, I haven't passed out or fainted.",
          descriptionBn: hasSyncope ? "জি, চোখের সামনে অন্ধকার দেখে কিছুক্ষণের জন্য বেহুঁশ হয়ে পড়েছিলাম।" : "না ডাক্তার সাহেব, আমি অজ্ঞান বা বেহুঁশ হইনি কখনো।",
        },
        dizziness: {
          present: sym.includes('dizziness') || sym.includes('lightheaded'),
          descriptionEn: sym.includes('dizziness') ? "Yes, I feel dizzy and lightheaded when standing." : "No, I don't feel dizzy.",
          descriptionBn: sym.includes('dizziness') ? "জি ডাক্তার, দাঁড়ালে মাথা চক্কর দিয়ে ওঠে।" : "না ডাক্তার, মাথা ঘোরার কোনো অনুভূতি নেই।",
        },
        ocular: {
          present: hasOcular,
          descriptionEn: hasOcular
            ? (sym.includes('retro-orbital') || cc.toLowerCase().includes('dengue')
                ? "Yes doctor, I have severe deep aching behind both of my eyes."
                : "Yes doctor, there is throbbing pain behind my eye, and light makes it so painful that I can barely open my eyes.")
            : "No doctor, I do not have any eye pain or vision problems.",
          descriptionBn: hasOcular
            ? (sym.includes('retro-orbital') || cc.toLowerCase().includes('dengue')
                ? "জি ডাক্তার, দুই চোখের পেছনের দিকে তীব্র চাপ ও অসহ্য টনটন করা ব্যথা হচ্ছে।"
                : "জি ডাক্তার, চোখের পেছনে এবং চারপাশেও বেশ চাপ ও টনটন করে ব্যথা লাগে, বিশেষ করে আলো দেখলে চোখ মেলাই দায় হয়ে যায়।")
            : "না ডাক্তার সাহেব, আমার চোখে কোনো সমস্যা বা চোখে কোনো ব্যথা নেই।",
        },
        phonophobia: {
          present: hasPhono,
          descriptionEn: hasPhono
            ? "Yes doctor, loud noise or sounds make the headache unbearable."
            : "No doctor, noise does not particularly bother me.",
          descriptionBn: hasPhono
            ? "জি ডাক্তার, একটু জোরে আওয়াজ বা শব্দ হলেও মাথায় খুব বেশি যন্ত্রণা লাগে।"
            : "না ডাক্তার, শব্দে কোনো বাড়তি কষ্ট হয় না।",
        },
        neckStiffness: {
          present: hasNeck,
          descriptionEn: hasNeck
            ? "Yes doctor, my neck feels rigid and painful when I try to bend it."
            : "No doctor, my neck is completely supple and moves without any pain.",
          descriptionBn: hasNeck
            ? "জি ডাক্তার, ঘাড় খুব শক্ত হয়ে আছে এবং সামনে ঝোঁকাতে খুব কষ্ট হয়।"
            : "না ডাক্তার সাহেব, আমার ঘাড়ে কোনো ব্যথা বা টান লাগার সমস্যা নেই, ঘাড় স্বাভাবিকভাবেই সবদিকে নাড়াতে পারছি।",
        },
        trauma: {
          present: hasTrauma,
          descriptionEn: hasTrauma
            ? "Yes doctor, I had a recent injury to my head or body."
            : "No doctor, I have not had any head injury, fall, or physical trauma.",
          descriptionBn: hasTrauma
            ? "জি ডাক্তার, আমার একটা চোট লেগেছিল।"
            : "না ডাক্তার, আমার মাথায় বা শরীরে কোনো আঘাত বা চোট লাগেনি।",
        },
        neurologicalDeficit: {
          present: hasNeuro,
          descriptionEn: hasNeuro
            ? "Yes doctor, I have noticed some numbness or weakness in my limbs."
            : "No doctor, I have no weakness or numbness in my limbs, and no speech difficulty.",
          descriptionBn: hasNeuro
            ? "জি ডাক্তার, হাত-পায়ে একটু অবশ ভাব আছে।"
            : "না ডাক্তার সাহেব, কোনো অঙ্গ অবশ হওয়া, ঝিমঝিম করা বা কথা জড়িয়ে যাওয়ার মতো কোনো সমস্যা হয়নি।",
        },
      },
      pastMedicalHistory: {
        descriptionEn: pmhEn,
        descriptionBn: pmhBn,
        conditions,
      },
      pastSurgicalHistory: {
        hasSurgery: surgEn.includes('Yes'),
        descriptionEn: surgEn,
        descriptionBn: surgBn,
      },
      medications: {
        takesMedicine: hasMeds,
        descriptionEn: medsEn,
        descriptionBn: medsBn,
      },
      allergies: {
        hasAllergies,
        descriptionEn: alEn,
        descriptionBn: alBn,
      },
      familyHistory: {
        hasFamilyIllness: hasFam,
        descriptionEn: famEn,
        descriptionBn: famBn,
      },
      socialHistory: {
        occupation,
        smoking: {
          isSmoker,
          detailsEn: smkEn,
          detailsBn: smkBn,
        },
        alcohol: {
          drinksAlcohol: isDrinker,
          detailsEn: alcEn,
          detailsBn: alcBn,
        },
        diet: {
          detailsEn: soc.includes('fatty') ? "I eat a lot of rich, oily and fatty foods regularly." : "I eat a normal home-cooked diet.",
          detailsBn: soc.includes('fatty') ? "জি ডাক্তার, একটু তেল-চর্বিযুক্ত খাবার বেশি খাওয়া হয়।" : "স্বাভাবিক ঘরের তৈরি খাবারই খাই ডাক্তার।",
        },
        sleep: {
          detailsEn: soc.includes('poor sleep') || soc.includes('sleep') ? "My sleep has been very disturbed and poor." : "My sleep is usually fine.",
          detailsBn: soc.includes('poor sleep') || soc.includes('sleep') ? "কদিন ধরে রাতে ঠিকমতো ঘুম হচ্ছে না ডাক্তার।" : "ঘুম মোটামুটি স্বাভাবিকই হয় ডাক্তার।",
        },
        livingSituation: {
          detailsEn: soc || "I live with my family.",
          detailsBn: "আমি পরিবারের সাথেই থাকি ডাক্তার।",
        },
      },
      systemicReview: {
        previousEpisodes: {
          hadPrevious: sym.includes('recurring') || sym.includes('previous episodes') || sym.includes('episodes per'),
          detailsEn: sym.includes('recurring') ? "Yes, I have had similar episodes in the past." : "No, this is the very first time I've ever experienced this.",
          detailsBn: sym.includes('recurring') ? "জি ডাক্তার, আগেও কয়েকবার এমন হয়েছিল।" : "না ডাক্তার সাহেব, আমার জীবনে আগে কখনো এমন সমস্যা হয়নি, এটাই প্রথম।",
        },
        treatmentHistory: {
          takenPriorMedicine: sym.includes('paracetamol') || rx.includes('paracetamol'),
          detailsEn: "I tried taking some paracetamol and resting, but it didn't really help much.",
          detailsBn: "ব্যথা সহ্য করতে না পেরে একটা প্যারাসিটামল খেয়েছিলাম, কিন্তু তেমন কোনো আরাম মেলেনি।",
        },
      },
      patientConcerns: {
        concernEn: "I am honestly worried that this might be something dangerous or life-threatening.",
        concernBn: "ডাক্তার সাহেব, আমি খুব দুশ্চিন্তায় আছি এটা মারাত্মক কোনো জটিল রোগ কি না।",
        expectationEn: "I just hope you can find out what is causing this and give me the right treatment.",
        expectationBn: "আমি শুধু আশা করছি আপনি রোগটা শনাক্ত করে সঠিক চিকিৎসার ব্যবস্থা করবেন ডাক্তার।",
      },
      hiddenClinicalData: {
        hiddenDiagnosis: caseContext.hiddenDiagnosis,
        redFlags: caseContext.redFlags,
      },
    };
  }
}
