jest.mock('googleapis', () => ({
  google: {
    auth: { OAuth2: jest.fn().mockImplementation(() => ({ setCredentials: jest.fn() })) },
    gmail: jest.fn(),
  },
}));

describe('Gmail error log privacy', () => {
  it('reports invalid_grant without logging the email body, token or provider response', async () => {
    const keys = ['GMAIL_USER', 'GMAIL_REFRESH_TOKEN', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
    const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    keys.forEach(key => { process.env[key] = 'private-' + key; });
    const error = Object.assign(new Error('private-token'), {
      response: {
        status: 400,
        data: { error: 'invalid_grant', error_description: 'private-sender@example.com' },
        config: { headers: { Authorization: 'Bearer private-token' } },
      },
    });
    const output = jest.spyOn(console, 'error').mockImplementation(() => {});
    const info = jest.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const { google } = require('googleapis');
      google.gmail.mockReturnValue({ users: { messages: { send: jest.fn().mockRejectedValue(error) } } });
      let sendEmail;
      jest.isolateModules(() => { ({ sendEmail } = require('../../../utils/sendEmail')); });

      await expect(sendEmail({
        to: 'private-recipient@example.com', subject: 'Verification', html: 'private-link-token',
      })).rejects.toBe(error);

      expect(output).toHaveBeenCalledWith('[sendEmail] Gmail API error:', {
        code: 'invalid_grant', status: 400,
      });
      expect(JSON.stringify([...output.mock.calls, ...info.mock.calls])).not.toContain('private-');
    } finally {
      for (const key of keys) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
      }
      jest.restoreAllMocks();
    }
  });
});
