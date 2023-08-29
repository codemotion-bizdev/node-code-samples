import path from 'path';
import { Model } from 'objection';

import { ModelNames } from '@utils/constants';
import { ModelWithArrays } from '@utils/helpers/ModelWithArrays';

export class CampaignSurveyModel extends ModelWithArrays {
  constructor() {
    super(['partnerIds']);
  }

  static get tableName() {
    return ModelNames.MODEL_NAME__CAMPAIGN_SURVEY;
  }

  static get relationMappings() {
    return {
      campaign: {
        relation: Model.BelongsToOneRelation,
        modelClass: path.resolve(__dirname, '../campaign/campaignModel.js'),

        join: {
          to: `${ModelNames.MODEL_NAME__CAMPAIGNS}.id`,
          from: `${ModelNames.MODEL_NAME__CAMPAIGN_SURVEY}.campaignId`,
        },
      },

      brief: {
        relation: Model.BelongsToOneRelation,
        modelClass: path.resolve(__dirname, '../brief/briefModel'),
        join: {
          from: `${ModelNames.MODEL_NAME__CAMPAIGN_SURVEY}.briefId`,
          to: `${ModelNames.MODEL_NAME__BRIEF}.id`,
        },
      },

      questions: {
        relation: Model.HasManyRelation,
        modelClass: path.resolve(__dirname, './surveyQuestionModel'),
        join: {
          from: `${ModelNames.MODEL_NAME__SURVEY_QUESTION}.campaignSurveyId`,
          to: `${ModelNames.MODEL_NAME__CAMPAIGN_SURVEY}.id`,
        },
      },
    };
  }
}
