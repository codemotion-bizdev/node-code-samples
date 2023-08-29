import { Model } from 'objection';
import { ModelNames } from '@utils/constants';

const path = require('path');

export class SurveyQuestionModel extends Model {
  static get tableName() {
    return ModelNames.MODEL_NAME__SURVEY_QUESTION;
  }

  async $beforeInsert() {
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  async $beforeUpdate() {
    this.updatedAt = new Date().toISOString();
  }

  static get relationMappings() {
    return {
      survey: {
        relation: Model.BelongsToOneRelation,
        modelClass: path.resolve(__dirname, './campaignSurveyModel.js'),

        join: {
          to: `${ModelNames.MODEL_NAME__CAMPAIGN_SURVEY}.id`,
          from: `${ModelNames.MODEL_NAME__SURVEY_QUESTION}.campaignSurveyId`,
        },
      },

      answers: {
        relation: Model.HasManyRelation,
        modelClass: path.resolve(__dirname, './surveyAnswerModel'),
        join: {
          from: `${ModelNames.MODEL_NAME__SURVEY_ANSWER}.surveyQuestionId`,
          to: `${ModelNames.MODEL_NAME__SURVEY_QUESTION}.id`,
        },
      },
    };
  }
}
