import lodash from 'lodash';

import { ModelNames } from '@utils/constants';
import Logger from '@common/libs/logger';
import { CampaignSurveyModel } from './campaignSurveyModel';
import { SurveyAnswerModel } from './surveyAnswerModel';
import { SurveyQuestionModel } from './surveyQuestionModel';

export const getSurveysWithAllRelations = async (campaignId) =>
  CampaignSurveyModel.query()
    .where({
      campaignId,
    })
    .allowGraph('[questions.[answers]]')
    .withGraphJoined('[questions.[answers]]');

export const deleteSurveyById = async (surveyId) => {
  const survey = await CampaignSurveyModel.query()
    .findById(surveyId)
    .allowGraph('[questions.[answers]]')
    .withGraphJoined('[questions.[answers]]');

  if (!survey || !Array.isArray(survey.questions)) {
    return false;
  }

  const entityIds = survey.questions.reduce(
    (res, question) => {
      if (question && question.id) {
        res.questionIds.push(question.id);
      }
      if (question && Array.isArray(question.answers)) {
        res.answerIds = res.answerIds.concat(question.answers.map((a) => a.id));
      }

      return res;
    },
    {
      questionIds: [],
      answerIds: [],
    },
  );
  Logger.log(`deleteSurveyById, ids: ${JSON.stringify(entityIds)}`);

  return SurveyAnswerModel.query()
    .whereIn('id', lodash.uniq(lodash.compact(entityIds.answerIds)))
    .delete()
    .then(() =>
      SurveyQuestionModel.query()
        .whereIn('id', lodash.uniq(lodash.compact(entityIds.questionIds)))
        .delete()
        .then(() =>
          CampaignSurveyModel.query()
            .findById(surveyId)
            .delete(),
        ),
    )
    .catch((error) => {
      throw error;
    });
};

export const upsertSurveyData = async (data) => CampaignSurveyModel.query().upsertGraph(data);

export const insertQuestion = async (data) =>
  SurveyQuestionModel.query()
    .insert(data)
    .returning('id');

export const updateQuestion = async (id, data) => SurveyQuestionModel.query().patchAndFetchById(id, data);

export const insertAnswer = async (data) =>
  SurveyAnswerModel.query()
    .insert(data)
    .returning('id');

export const updateAnswer = async (id, data) => SurveyAnswerModel.query().patchAndFetchById(id, data);

export const getSurveyWithRelationsById = async (surveyIds, relations) =>
  CampaignSurveyModel.query()
    .whereIn('id', surveyIds)
    .allowGraph(`[${relations || ''}]`)
    .withGraphJoined(`[${relations || ''}]`);

const filterSurveys = (queryBuilder, filters) => {
  const offset = filters.offset || 0;
  const limit = filters.limit || 1;

  return queryBuilder.page(offset / limit, limit);
};

export const getAllSurveysByFilters = async (campaignId, filters = []) => {
  Logger.log(`getAllSurveysByFilters, campaign id: ${campaignId}, filters: ${JSON.stringify(filters)}`);

  // get all available surveys with needed info
  const surveys = await CampaignSurveyModel.query()
    .select(`${ModelNames.MODEL_NAME__CAMPAIGN_SURVEY}.id`, 'title', 'isEqualAnswers', 'partnerIds')
    .where({ campaignId });

  Logger.log(`getAllSurveysByFilters, survey ids: ${JSON.stringify(surveys)}`);

  if (!Array.isArray(surveys) || !surveys.length) {
    Logger.log('getAllSurveysByFilters, no surveys available');
    return {
      results: [],
      total: 0,
    };
  }

  // get all questions with pagination
  const queryBuilder = SurveyQuestionModel.query().whereIn(
    'campaignSurveyId',
    lodash.compact(surveys).map((s) => s.id),
  );
  const questions = await filterSurveys(queryBuilder, filters);
  Logger.log(`getAllSurveysByFilters, questions: ${JSON.stringify(questions)}`);

  // get all answers
  const answers = await SurveyAnswerModel.query().whereIn(
    'surveyQuestionId',
    (lodash.get(questions, 'results') || []).map((s) => s.id),
  );

  return {
    surveys,
    questions,
    answers,
  };
};
