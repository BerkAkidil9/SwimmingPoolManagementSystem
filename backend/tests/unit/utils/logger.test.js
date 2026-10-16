const { logError } = require('../../../utils/logger');

describe('Safe error logging', () => {
  let output;

  beforeEach(() => {
    output = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('keeps a database error code without logging values, SQL details or stack', () => {
    const error = Object.assign(new Error('password=private-password'), {
      code: '23505',
      detail: 'email=private@example.com',
      parameters: ['private-password'],
      request: { body: Buffer.from('private-document') },
    });

    logError('Registration failed', error);

    expect(output).toHaveBeenCalledWith('Registration failed', { code: '23505' });
    expect(JSON.stringify(output.mock.calls)).not.toContain('private-');
  });

  it('keeps the Gmail failure category and HTTP status without its HTTP payload', () => {
    const error = {
      message: 'private-token',
      response: {
        status: 400,
        data: { error: 'invalid_grant', error_description: 'private-email@example.com' },
        config: { headers: { Authorization: 'Bearer private-token' } },
      },
    };

    logError('Email failed', error);

    expect(output).toHaveBeenCalledWith('Email failed', { code: 'invalid_grant', status: 400 });
    expect(JSON.stringify(output.mock.calls)).not.toContain('private-');
  });

  it('does not output unknown error codes, string statuses or unstructured errors', () => {
    logError('Upload failed', { code: 'private-filename', status: 'private-token' });
    logError('Email failed', 'private-token');
    logError('Unknown failure');

    expect(output.mock.calls).toEqual([
      ['Upload failed'], ['Email failed'], ['Unknown failure'],
    ]);
  });
});
