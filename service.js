import lodash from 'lodash';

import {
  getSurveysWithAllRelations,
  upsertSurveyData,
  deleteSurveyById,
  insertQuestion,
  updateQuestion,
  insertAnswer,
  updateAnswer,
  getSurveyWithRelationsById,
  getAllSurveysByFilters,
} from '@modules/survey/repository';

import { NotFoundError } from '@common/libs/errorClasses';
import { ErrorMessages } from '@utils/constants';

import Logger from '@common/libs/logger';

const SURVEY_RESTRICTED_FIELD = ['createdAt', 'updatedAt'];
const QUESTION_RESTRICTED_FIELD = ['createdAt', 'updatedAt'];

const toPublicViewForSurvey = (surveys) =>
  surveys.map((survey) => {
    const newSurvey = lodash.cloneDeep(lodash.omit(survey, SURVEY_RESTRICTED_FIELD));
    const questions = newSurvey.questions.map((question) => {
      const newQuestion = lodash.cloneDeep(lodash.omit(question, SURVEY_RESTRICTED_FIELD));
      const answers = newQuestion.answers.map((answer) => lodash.omit(answer, SURVEY_RESTRICTED_FIELD));

      return {
        ...newQuestion,
        answers,
      };
    });

    return {
      ...newSurvey,
      questions,
    };
  });

export const getSurveysWithRelations = async (campaignId) => {
  Logger.log(`getSurveysWithRelations, campaign id: ${campaignId}`);

  if (!campaignId) {
    throw new NotFoundError(ErrorMessages.MSG_NOT_FOUND_WITH_ID);
  }

  const survey = await getSurveysWithAllRelations(campaignId);

  return toPublicViewForSurvey(survey);
};

export const deleteSurvey = async (surveyId) => {
  Logger.log(`deleteSurvey, survey id: ${surveyId}`);

  if (!surveyId) {
    throw new NotFoundError(ErrorMessages.MSG_NOT_FOUND_WITH_ID);
  }

  return deleteSurveyById(surveyId);
};

const upsertQuestions = async (questions) => {
  Logger.log(`upsertQuestions, questions: ${JSON.stringify(questions)}`);

  if (!Array.isArray(questions) || !questions.length) {
    Logger.log('upsertQuestions, no questions');
    return true;
  }

  const newQuestions = questions.filter((q) => q && !q.id);
  const updatedQuestions = questions.filter((q) => q && !!q.id);

  const promises = [insertQuestion(newQuestions)];
  updatedQuestions.forEach((question) => {
    promises.push(updateQuestion(question));
  });

  return Promise.all(promises);
};

const upsertAnswers = async (answers) => {
  Logger.log(`upsertAnswers, answers: ${JSON.stringify(answers)}`);

  if (!Array.isArray(answers) || !answers.length) {
    Logger.log('upsertAnswers, no answers');
    return true;
  }

  const newAnswers = answers.filter((a) => a && !a.id);
  const updatedAnswers = answers.filter((a) => a && !!a.id);

  const promises = [insertAnswer(newAnswers)];
  updatedAnswers.forEach((answer) => {
    promises.push(updateAnswer(answer));
  });

  return Promise.all(promises);
};


const validateSurveys = async (surveys) => {
  if (!Array.isArray(surveys)) {
    return true;
  }
  const ids = lodash.uniq(lodash.compact(surveys.map((s) => s.id)));
  if (!Array.isArray(ids) || !ids.length) {
    return true;
  }
  return getSurveyWithRelationsById(ids, ['campaign.[cart], questions.[answers]']);
};

export const upsertSurvey = async (input) => {
  Logger.log(`upsertSurvey, input: ${JSON.stringify(input)}`);

  if (!input) {
    throw new NotFoundError(ErrorMessages.MSG_NOT_FOUND_WITH_ID);
  }

  // validation
  await Promise.all([
    validateSurveys(lodash.get(input, 'surveys')),
    validateQuestions(lodash.get(input, 'questions')),
    validateAnswers(lodash.get(input, 'answers')),
  ]);

  const promises = [];
  if (lodash.get(input, 'surveys')) {
    promises.push(upsertSurveyData(lodash.get(input, 'surveys')));
  }
  if (lodash.get(input, 'questions')) {
    promises.push(upsertQuestions(lodash.get(input, 'questions')));
  }
  if (lodash.get(input, 'answers')) {
    promises.push(upsertAnswers(lodash.get(input, 'answers')));
  }
  return Promise.all(promises);
};

const toPublicViewForClientSurveys = (data, partnerIdsFormFilter = []) => {
  Logger.log(
    `toPublicViewForClientSurveys, data: ${JSON.stringify(data)}, partner ids: ${JSON.stringify(partnerIdsFormFilter)}`,
  );

  if (!data || !data.questions || !Array.isArray(data.questions.results) || !Array.isArray(data.surveys)) {
    Logger.log('toPublicViewForClientSurveys, wrong data from db');
    return {
      results: [],
      total: 0,
    };
  }

  const results = lodash.compact(data.questions.results).map((question) => {
    const survey = data.surveys.find((s) => lodash.get(s, 'id') === lodash.get(question, 'campaignSurveyId'));

    const allAnswers = data.answers || [];
    const questionAnswers = allAnswers.filter((a) => lodash.get(a, 'surveyQuestionId') === lodash.get(question, 'id'));

    const partnerIds = lodash.intersection(
      partnerIdsFormFilter.map((p) => Number(p)),
      lodash.get(survey, 'partnerIds') || [],
    );
    const partnerQuanity = lodash.get(partnerIds, 'length') !== 0 ? 1 : -1;

    const sumAnswers = questionAnswers.reduce((res, answer) => {
      const titleIndex = res.findIndex((a) => lodash.get(a, 'title') === lodash.get(answer, 'title'));

      if (titleIndex !== -1) {
        const newRes = lodash.cloneDeep(res);
        newRes[titleIndex].sumQuantity += lodash.get(answer, 'quantity') * partnerQuanity;
        return newRes;
      }

      return [
        ...res,
        {
          title: lodash.get(answer, 'title'),
          sumQuantity: lodash.get(answer, 'quantity') * partnerQuanity,
        },
      ];
    }, []);

    return {
      ...lodash.omit(question, QUESTION_RESTRICTED_FIELD),
      surveyTitle: lodash.get(survey, 'title'),
      surveyIsEqualAnswers: lodash.get(survey, 'isEqualAnswers'),
      surveyPartnerIds: lodash.get(survey, 'partnerIds'),
      sumAnswers,
      answers: questionAnswers,
    };
  });

  return {
    ...data.questions,
    results,
  };
};

export const getSurveysClientView = async (filters, campaignId, user) => {
  Logger.log(`getSurveysClientView, filters: ${JSON.stringify(filters)}, campaign id: ${campaignId}`);

  if (!user || !user.id || !filters || !campaignId) {
    throw new NotFoundError(ErrorMessages.MSG_NOT_FOUND_WITH_ID);
  }

  const data = await getAllSurveysByFilters(campaignId, filters);
  return toPublicViewForClientSurveys(data, lodash.get(filters, 'partnerIds'));
};
