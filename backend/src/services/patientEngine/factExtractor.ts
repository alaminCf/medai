import { ClinicalFact, PatientCaseContext } from './types';
import { TruthLayerBuilder } from './truthLayer';

export class StructuredClinicalFactExtractor {
  /**
   * Extracts authoritative, structured clinical facts from the patient's case profile.
   * Maps every demographic, HPI, review of systems, and historical aspect into
   * a normalized ClinicalFact with English and Bangla expressions.
   */
  public static extractFacts(caseContext: PatientCaseContext): Record<string, ClinicalFact> {
    const facts: Record<string, ClinicalFact> = {};
    const truth = TruthLayerBuilder.build(caseContext);

    // 1. DEMOGRAPHICS (AGE, NAME, GENDER, OCCUPATION, MARITAL STATUS)
    facts['age'] = {
      factId: 'age',
      category: 'AGE',
      name: 'Patient Age',
      valueEn: `I am ${truth.demographics.age} years old, doctor.`,
      valueBn: `আমার বয়স ${truth.demographics.age} বছর, ডাক্তার।`,
      synonyms: ['age', 'years old', 'how old', 'বয়স', 'বয়েস', 'বছর'],
      importance: 'critical',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['name'] = {
      factId: 'name',
      category: 'NAME',
      name: 'Patient Name',
      valueEn: `My name is ${truth.demographics.name}.`,
      valueBn: `আমার নাম ${truth.demographics.name}।`,
      synonyms: ['name', 'full name', 'নাম', 'নামটা'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['gender'] = {
      factId: 'gender',
      category: 'SEX',
      name: 'Biological Gender',
      valueEn: `I am ${truth.demographics.gender}.`,
      valueBn: `আমি ${truth.demographics.gender === 'Male' ? 'পুরুষ' : 'মহিলা'}।`,
      synonyms: ['gender', 'sex', 'male', 'female', 'পুরুষ', 'মহিলা'],
      importance: 'supporting',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['occupation'] = {
      factId: 'occupation',
      category: 'OCCUPATION',
      name: 'Patient Occupation',
      valueEn: `I work as a ${truth.demographics.occupation}.`,
      valueBn: `আমি ${truth.demographics.occupation} হিসেবে কাজ করি।`,
      synonyms: ['occupation', 'job', 'work', 'profession', 'পেশা', 'কাজ', 'চাকরি', 'ব্যবসা'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['marital_status'] = {
      factId: 'marital_status',
      category: 'MARITAL_STATUS',
      name: 'Marital Status',
      valueEn: `I am ${truth.demographics.maritalStatus.toLowerCase()}.`,
      valueBn: `আমি ${truth.demographics.maritalStatus === 'Married' ? 'বিবাহিত' : 'অবিবাহিত'}।`,
      synonyms: ['married', 'single', 'spouse', 'বিবাহিত', 'বিয়ে'],
      importance: 'supporting',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 2. CHIEF COMPLAINT, ONSET, DURATION
    facts['chief_complaint'] = {
      factId: 'chief_complaint',
      category: 'CHIEF_COMPLAINT',
      name: 'Chief Complaint',
      valueEn: truth.chiefComplaint.text,
      valueBn: `আমার প্রধান সমস্যা হলো: ${truth.chiefComplaint.text}`,
      synonyms: ['chief complaint', 'main problem', 'reason for visit', 'সমস্যা', 'কষ্ট'],
      importance: 'critical',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['duration'] = {
      factId: 'duration',
      category: 'DURATION',
      name: 'Symptom Duration',
      valueEn: `It has been going on ${truth.hpi.duration}.`,
      valueBn: `এটা প্রায় ${truth.hpi.durationBn || truth.hpi.duration} ধরে হচ্ছে ডাক্তার।`,
      synonyms: ['how long', 'duration', 'time', 'কতদিন', 'কতক্ষণ', 'যাবত'],
      importance: 'critical',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['onset'] = {
      factId: 'onset',
      category: 'ONSET',
      name: 'Symptom Onset',
      valueEn: truth.hpi.onset,
      valueBn: truth.hpi.onsetBn || truth.hpi.onset,
      synonyms: ['start', 'when', 'began', 'শুরু', 'কখন থেকে'],
      importance: 'critical',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 3. SOCRATES: LOCATION, CHARACTER, SEVERITY, RADIATION
    facts['location'] = {
      factId: 'location',
      category: 'LOCATION',
      name: 'Pain Location',
      valueEn: truth.hpi.location,
      valueBn: truth.hpi.locationBn || truth.hpi.location,
      synonyms: ['site', 'where', 'spot', 'কোথায়', 'জায়গা'],
      importance: 'critical',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['character'] = {
      factId: 'character',
      category: 'CHARACTER',
      name: 'Pain Character',
      valueEn: truth.hpi.character,
      valueBn: truth.hpi.characterBn || truth.hpi.character,
      synonyms: ['character', 'feel like', 'type of pain', 'ধরন', 'কেমন ব্যথা'],
      importance: 'critical',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['severity'] = {
      factId: 'severity',
      category: 'SEVERITY',
      name: 'Pain Severity',
      valueEn: truth.hpi.severity,
      valueBn: truth.hpi.severityBn || truth.hpi.severity,
      synonyms: ['severity', 'scale', '1 to 10', 'rate', 'তীব্রতা', 'তীব্র'],
      importance: 'critical',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['radiation'] = {
      factId: 'radiation',
      category: 'RADIATION',
      name: 'Pain Radiation',
      valueEn: truth.hpi.radiation,
      valueBn: truth.hpi.radiationBn || truth.hpi.radiation,
      synonyms: ['radiation', 'spread', 'move', 'ছড়ায়', 'অন্য কোথাও'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 4. AGGRAVATING, RELIEVING, TIMING, PROGRESSION
    facts['aggravating_factors'] = {
      factId: 'aggravating_factors',
      category: 'AGGRAVATING_FACTORS',
      name: 'Aggravating Factors',
      valueEn: truth.hpi.aggravatingFactors.length > 0
        ? truth.hpi.aggravatingFactors.join(' ')
        : "I haven't noticed anything specific that makes it noticeably worse.",
      valueBn: truth.hpi.aggravatingFactors.length > 0
        ? `শারীরিক পরিশ্রম বা নড়াচড়া করলে ব্যথাটা বেড়ে যায় ডাক্তার।`
        : "না ডাক্তার, নির্দিষ্ট কোনো কিছুতে এটা খুব একটা বাড়ে বলে মনে হয়নি।",
      synonyms: ['worse', 'aggravate', 'triggers', 'বাড়ে', 'বৃদ্ধি'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['relieving_factors'] = {
      factId: 'relieving_factors',
      category: 'RELIEVING_FACTORS',
      name: 'Relieving Factors',
      valueEn: truth.hpi.relievingFactors.length > 0
        ? truth.hpi.relievingFactors.join(' ')
        : "Nothing seems to completely relieve the pain, but sitting quietly helps a little.",
      valueBn: truth.hpi.relievingFactors.length > 0
        ? `চুপচাপ বিশ্রাম নিলে ব্যথাটা কিছুটা কমে আসে ডাক্তার।`
        : "না ডাক্তার, পুরোপুরি কমার মতো কিছু পাইনি, তবে স্থির হয়ে বসে থাকলে একটু স্বস্তি লাগে।",
      synonyms: ['better', 'relieve', 'help', 'ease', 'কমে', 'আরাম'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['timing'] = {
      factId: 'timing',
      category: 'TIMING',
      name: 'Timing & Frequency',
      valueEn: truth.hpi.timing,
      valueBn: truth.hpi.timing.includes('constant')
        ? 'ব্যথাটা সারাদিনই প্রায় একটানা লেগে থাকে ডাক্তার।'
        : 'এটা সবসময় একরকম থাকে না, তরঙ্গের মতো আসে আর যায়।',
      synonyms: ['constant', 'intermittent', 'come and go', 'সবসময়', 'আসে আর যায়'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['progression'] = {
      factId: 'progression',
      category: 'PROGRESSION',
      name: 'Symptom Progression',
      valueEn: truth.hpi.progression,
      valueBn: truth.hpi.progression.includes('worse')
        ? 'সময় গড়ানোর সাথে সাথে কষ্টটা ধীরে ধীরে বাড়ছে ডাক্তার।'
        : 'শুরু থেকে কষ্টটা মোটামুটি একই রকম তীব্রতায় আছে।',
      synonyms: ['worse', 'progression', 'changing', 'বাড়ছে', 'উন্নতি'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 5. ASSOCIATED SYMPTOMS (FEVER, NAUSEA, VOMITING, BOWEL, BLADDER, APPETITE)
    facts['associated_symptoms'] = {
      factId: 'associated_symptoms',
      category: 'ASSOCIATED_SYMPTOMS',
      name: 'General Associated Symptoms',
      valueEn: `Along with this, ${truth.associatedSymptoms.nausea.descriptionEn} ${truth.associatedSymptoms.fever.descriptionEn}`,
      valueBn: `এর সাথে ${truth.associatedSymptoms.nausea.descriptionBn} ${truth.associatedSymptoms.fever.descriptionBn}`,
      synonyms: ['associated', 'other symptoms', 'অন্য কোনো সমস্যা', 'আর কিছু'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['fever'] = {
      factId: 'fever',
      category: 'FEVER',
      name: 'Fever Assessment',
      valueEn: truth.associatedSymptoms.fever.descriptionEn,
      valueBn: truth.associatedSymptoms.fever.descriptionBn,
      synonyms: ['fever', 'temperature', 'chills', 'জ্বর', 'গা গরম'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['nausea'] = {
      factId: 'nausea',
      category: 'NAUSEA',
      name: 'Nausea Assessment',
      valueEn: truth.associatedSymptoms.nausea.descriptionEn,
      valueBn: truth.associatedSymptoms.nausea.descriptionBn,
      synonyms: ['nausea', 'sick to stomach', 'বমি ভাব', 'বমি বমি'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['vomiting'] = {
      factId: 'vomiting',
      category: 'VOMITING',
      name: 'Vomiting Assessment',
      valueEn: truth.associatedSymptoms.vomiting.descriptionEn,
      valueBn: truth.associatedSymptoms.vomiting.descriptionBn,
      synonyms: ['vomit', 'throw up', 'বমি', 'বমি হয়েছে'],
      importance: 'critical',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['bowel_habits'] = {
      factId: 'bowel_habits',
      category: 'BOWEL_HABITS',
      name: 'Bowel Habits',
      valueEn: truth.associatedSymptoms.bowelChanges.descriptionEn,
      valueBn: truth.associatedSymptoms.bowelChanges.descriptionBn,
      synonyms: ['bowel', 'stool', 'diarrhea', 'constipation', 'পায়খানা', 'ডায়রিয়া', 'কোষ্ঠকাঠিন্য'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['urinary_symptoms'] = {
      factId: 'urinary_symptoms',
      category: 'URINARY_SYMPTOMS',
      name: 'Urinary Symptoms',
      valueEn: truth.associatedSymptoms.urinarySymptoms.descriptionEn,
      valueBn: truth.associatedSymptoms.urinarySymptoms.descriptionBn,
      synonyms: ['urinary', 'urine', 'peeing', 'burning', 'প্রস্রাব', 'জ্বালাপোড়া'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['appetite'] = {
      factId: 'appetite',
      category: 'APPETITE',
      name: 'Appetite Assessment',
      valueEn: truth.associatedSymptoms.appetite.descriptionEn,
      valueBn: truth.associatedSymptoms.appetite.descriptionBn,
      synonyms: ['appetite', 'eating', 'food', 'ক্ষুধা', 'রুচি'],
      importance: 'supporting',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['cough'] = {
      factId: 'cough',
      category: 'COUGH',
      name: 'Cough Assessment',
      valueEn: truth.associatedSymptoms.cough.descriptionEn,
      valueBn: truth.associatedSymptoms.cough.descriptionBn,
      synonyms: ['cough', 'phlegm', 'কাশি', 'কফ'],
      importance: 'supporting',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['breathing'] = {
      factId: 'breathing',
      category: 'BREATHING',
      name: 'Breathing & Dyspnea',
      valueEn: truth.associatedSymptoms.dyspnea.descriptionEn,
      valueBn: truth.associatedSymptoms.dyspnea.descriptionBn,
      synonyms: ['breathing', 'breath', 'dyspnea', 'shortness of breath', 'শ্বাসকষ্ট', 'দম'],
      importance: 'critical',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['palpitation'] = {
      factId: 'palpitation',
      category: 'PALPITATION',
      name: 'Palpitations Assessment',
      valueEn: truth.associatedSymptoms.palpitation.descriptionEn,
      valueBn: truth.associatedSymptoms.palpitation.descriptionBn,
      synonyms: ['palpitation', 'racing heart', 'বুক ধড়ফড়'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['syncope'] = {
      factId: 'syncope',
      category: 'SYNCOPE',
      name: 'Syncope Assessment',
      valueEn: truth.associatedSymptoms.syncope.descriptionEn,
      valueBn: truth.associatedSymptoms.syncope.descriptionBn,
      synonyms: ['faint', 'pass out', 'blackout', 'অজ্ঞান', 'বেহুঁশ'],
      importance: 'critical',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['dizziness'] = {
      factId: 'dizziness',
      category: 'DIZZINESS',
      name: 'Dizziness Assessment',
      valueEn: truth.associatedSymptoms.dizziness.descriptionEn,
      valueBn: truth.associatedSymptoms.dizziness.descriptionBn,
      synonyms: ['dizzy', 'lightheaded', 'মাথা ঘোরা', 'মাথা চক্কর'],
      importance: 'supporting',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 6. HISTORIES: PAST MEDICAL, SURGICAL, MEDICATION, ALLERGY, FAMILY, SOCIAL
    facts['past_medical_history'] = {
      factId: 'past_medical_history',
      category: 'PAST_MEDICAL_HISTORY',
      name: 'Past Medical History',
      valueEn: truth.pastMedicalHistory.descriptionEn,
      valueBn: truth.pastMedicalHistory.descriptionBn,
      synonyms: ['medical history', 'chronic illness', 'past diseases', 'আগের রোগ', 'অতীতের ইতিহাস'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['past_surgical_history'] = {
      factId: 'past_surgical_history',
      category: 'PAST_SURGICAL_HISTORY',
      name: 'Past Surgical History',
      valueEn: truth.pastSurgicalHistory.descriptionEn,
      valueBn: truth.pastSurgicalHistory.descriptionBn,
      synonyms: ['surgeries', 'operations', 'hospitalized', 'অপারেশন', 'সার্জারি'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['medication'] = {
      factId: 'medication',
      category: 'MEDICATION',
      name: 'Medication History',
      valueEn: truth.medications.descriptionEn,
      valueBn: truth.medications.descriptionBn,
      synonyms: ['medicines', 'drugs', 'pills', 'tablets', 'ওষুধ', 'ঔষধ'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['allergy'] = {
      factId: 'allergy',
      category: 'ALLERGY',
      name: 'Allergy History',
      valueEn: truth.allergies.descriptionEn,
      valueBn: truth.allergies.descriptionBn,
      synonyms: ['allergies', 'allergic', 'reactions', 'অ্যালার্জি', 'এলার্জি'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['family_history'] = {
      factId: 'family_history',
      category: 'FAMILY_HISTORY',
      name: 'Family History',
      valueEn: truth.familyHistory.descriptionEn,
      valueBn: truth.familyHistory.descriptionBn,
      synonyms: ['family', 'parents', 'father', 'mother', 'পরিবার', 'বংশগত'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['social_history'] = {
      factId: 'social_history',
      category: 'SOCIAL_HISTORY',
      name: 'Social History',
      valueEn: truth.socialHistory.livingSituation.detailsEn,
      valueBn: truth.socialHistory.livingSituation.detailsBn,
      synonyms: ['social', 'lifestyle', 'living', 'পরিবেশ', 'বাসা'],
      importance: 'supporting',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['smoking'] = {
      factId: 'smoking',
      category: 'SMOKING',
      name: 'Smoking History',
      valueEn: truth.socialHistory.smoking.detailsEn,
      valueBn: truth.socialHistory.smoking.detailsBn,
      synonyms: ['smoke', 'cigarettes', 'tobacco', 'ধূমপান', 'সিগারেট'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['alcohol'] = {
      factId: 'alcohol',
      category: 'ALCOHOL',
      name: 'Alcohol History',
      valueEn: truth.socialHistory.alcohol.detailsEn,
      valueBn: truth.socialHistory.alcohol.detailsBn,
      synonyms: ['alcohol', 'drinks', 'মদ্যপান', 'মদ'],
      importance: 'supporting',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['diet'] = {
      factId: 'diet',
      category: 'DIET',
      name: 'Dietary Habits',
      valueEn: truth.socialHistory.diet.detailsEn,
      valueBn: truth.socialHistory.diet.detailsBn,
      synonyms: ['diet', 'eating', 'food habits', 'খাওয়াদাওয়া', 'খাবার'],
      importance: 'supporting',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['sleep'] = {
      factId: 'sleep',
      category: 'SLEEP',
      name: 'Sleep Assessment',
      valueEn: truth.socialHistory.sleep.detailsEn,
      valueBn: truth.socialHistory.sleep.detailsBn,
      synonyms: ['sleep', 'insomnia', 'ঘুম'],
      importance: 'supporting',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    // 7. PREVIOUS EPISODES, TREATMENT, PATIENT CONCERNS
    facts['previous_episodes'] = {
      factId: 'previous_episodes',
      category: 'PREVIOUS_EPISODES',
      name: 'Previous Episodes',
      valueEn: truth.systemicReview.previousEpisodes.detailsEn,
      valueBn: truth.systemicReview.previousEpisodes.detailsBn,
      synonyms: ['previous episodes', 'before', 'happened before', 'আগে হয়েছিল', 'আগে কখনো'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['treatment_history'] = {
      factId: 'treatment_history',
      category: 'TREATMENT_HISTORY',
      name: 'Prior Treatment History',
      valueEn: truth.systemicReview.treatmentHistory.detailsEn,
      valueBn: truth.systemicReview.treatmentHistory.detailsBn,
      synonyms: ['treatment', 'taken medicine', 'visited doctor', 'ওষুধ খেয়েছেন', 'ডাক্তার দেখিয়েছেন'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['patient_concern'] = {
      factId: 'patient_concern',
      category: 'PATIENT_CONCERN',
      name: 'Patient Concerns & Fears',
      valueEn: truth.patientConcerns.concernEn,
      valueBn: truth.patientConcerns.concernBn,
      synonyms: ['worried', 'fears', 'concerns', 'দুশ্চিন্তা', 'ভয়'],
      importance: 'important',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    facts['patient_expectation'] = {
      factId: 'patient_expectation',
      category: 'PATIENT_EXPECTATION',
      name: 'Patient Expectations',
      valueEn: truth.patientConcerns.expectationEn,
      valueBn: truth.patientConcerns.expectationBn,
      synonyms: ['expectation', 'hope', 'help', 'আশা', 'চাচ্ছেন'],
      importance: 'supporting',
      status: 'undisclosed',
      disclosureCount: 0,
    };

    return facts;
  }
}
