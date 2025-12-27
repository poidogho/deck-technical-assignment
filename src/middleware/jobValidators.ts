import { body, header, param, query } from 'express-validator';

export const validateCreateJob = [
  header('x-api-key')
    .notEmpty()
    .withMessage('x-api-key header is required')
    .isString()
    .withMessage('x-api-key must be a string')
    .trim(),
  body('url')
    .notEmpty()
    .withMessage('url is required')
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('url must be a valid HTTP or HTTPS URL'),
  body('options')
    .optional()
    .isObject()
    .withMessage('options must be an object'),
];

export const validateListJobs = [
  header('x-api-key')
    .notEmpty()
    .withMessage('x-api-key header is required')
    .isString()
    .withMessage('x-api-key must be a string')
    .trim(),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer')
    .toInt(),
  query('page_size')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('page_size must be between 1 and 100')
    .toInt(),
];

export const validateJobId = [
  param('id')
    .notEmpty()
    .withMessage('job id is required')
    .isUUID()
    .withMessage('job id must be a valid UUID'),
];
