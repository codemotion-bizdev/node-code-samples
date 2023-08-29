import { Model } from 'objection';
import { ModelNames } from '@utils/constants';

const path = require('path');

export class SurveyAnswerModel extends Model {
  static get tableName() {
    return ModelNames.MODEL_NAME__SURVEY_ANSWER;
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
      question: {
        relation: Model.BelongsToOneRelation,
        modelClass: path.resolve(__dirname, './surveyQuestionModel.js'),

        join: {
          to: `${ModelNames.MODEL_NAME__SURVEY_QUESTION}.id`,
          from: `${ModelNames.MODEL_NAME__SURVEY_ANSWER}.surveyQuestionId`,
        },
      },

      partner: {
        relation: Model.BelongsToOneRelation,
        modelClass: path.resolve(__dirname, '../partnerProfile/partnerProfileModel.js'),

        join: {
          to: `${ModelNames.MODEL_NAME__PARTNER_PROFILE}.id`,
          from: `${ModelNames.MODEL_NAME__SURVEY_ANSWER}.partnerProfileId`,
        },
      },
    };
  }
}
