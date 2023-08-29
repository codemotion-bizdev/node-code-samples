import { sendResponse as send } from '@utils/helpers';

import * as surveyService from '@modules/survey/service';

import { HttpStatuses, SuccessMessages } from '@utils/constants';
import Logger from '@common/libs/logger';

export const getSurveys = async (ctx) => {
  Logger.log(`getSurveys, params: ${JSON.stringify(ctx.params)}`);

  const { campaignId } = ctx.params;

  const surveys = await surveyService.getSurveysWithRelations(campaignId);

  return send({
    ctx,
    status: HttpStatuses.HTTP_STATUS_SUCCESS,
    message: SuccessMessages.MSG_OPERATION_IS_SUCCESSFULL,
    content: surveys,
  });
};

export const deleteSurvey = async (ctx) => {
  Logger.log(`deleteSurvey, params: ${JSON.stringify(ctx.params)}`);

  const { surveyId } = ctx.params;

  await surveyService.deleteSurvey(surveyId);

  return send({
    ctx,
    status: HttpStatuses.HTTP_STATUS_SUCCESS,
    message: SuccessMessages.MSG_OPERATION_IS_SUCCESSFULL,
  });
};

export const upsertSurvey = async (ctx) => {
  Logger.log(`upsertSurvey, body: ${JSON.stringify(ctx.request.body)}`);

  const input = ctx.request.body;

  const surveys = await surveyService.upsertSurvey(input);

  return send({
    ctx,
    status: HttpStatuses.HTTP_STATUS_SUCCESS,
    message: SuccessMessages.MSG_SURVEY_SUCCESS,
    content: surveys,
  });
};

export const exportSurveys = async (ctx) => {
  Logger.log(`exportSurveys, query: ${JSON.stringify(ctx.request.query)}`);

  const filters = ctx.request.query;
  const { campaignId } = ctx.params;
  const surveys = await surveyService.getSurveysClientView(filters, campaignId, ctx.user);

  return send({
    ctx,
    status: HttpStatuses.HTTP_STATUS_SUCCESS,
    message: SuccessMessages.MSG_OPERATION_IS_SUCCESSFULL,
    content: surveys,
  });
};
