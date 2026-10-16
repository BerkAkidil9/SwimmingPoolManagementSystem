import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import HealthReportUpload from '../../components/HealthReportUpload';

jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const member = {
  id: 42, name: 'Test', surname: 'Member', email: 'member@example.com',
  health_status: 'needs_report', health_status_reason: 'Please upload an additional report.',
};

function openUpload(url = '/upload-health-report/42') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/upload-health-report/:userId" element={<HealthReportUpload />} />
        <Route path="/upload-health-report" element={<HealthReportUpload />} />
        <Route path="/health-report-upload" element={<HealthReportUpload />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('HealthReportUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockReset().mockResolvedValue({ data: member });
    axios.post.mockReset().mockResolvedValue({ data: { success: true } });
    sessionStorage.clear();
  });

  it('shows the correct request and uploads the report for the signed-in recipient', async () => {
    const { container } = openUpload();
    await screen.findByText(member.health_status_reason);
    expect(screen.getByText(member.email)).toBeInTheDocument();
    const file = new File(['synthetic report'], 'report.pdf', { type: 'application/pdf' });
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Submit Health Report/i }));

    await screen.findByText('Health Report Submitted Successfully');
    const [url, body] = axios.post.mock.calls[0];
    expect(url).toBe('/api/member/upload-health-report');
    expect(body.get('report')).toBe(file);
    expect(body.get('expectedUserId')).toBe('42');
  });

  it.each(['/upload-health-report/42', '/health-report-upload?userId=42'])(
    'blocks a different signed-in account for the recipient link %s', async url => {
      axios.get.mockResolvedValue({ data: {
        ...member, id: 7, email: 'doctor@example.com', health_status: 'approved',
        health_status_reason: 'Fictional demo health data; not a medical assessment.',
      } });
      const { container } = openUpload(url);

      await screen.findByText(/This health report request belongs to another account/);
      expect(screen.getByText('doctor@example.com')).toBeInTheDocument();
      expect(screen.queryByText(/Fictional demo health data/)).not.toBeInTheDocument();
      expect(container.querySelector('input[type="file"]')).toBeNull();
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(axios.get).toHaveBeenCalledWith('/api/member/user/me', { withCredentials: true });
      expect(axios.post).not.toHaveBeenCalled();
    },
  );

  it.each(['approved', 'pending', 'rejected'])(
    'does not display an upload form without an active request (%s)', async health_status => {
      axios.get.mockResolvedValue({ data: { ...member, health_status } });
      const { container } = openUpload();

      await screen.findByText('No health report upload required');
      expect(screen.queryByText(member.health_status_reason)).not.toBeInTheDocument();
      expect(container.querySelector('input[type="file"]')).toBeNull();
    },
  );

  it('keeps the upload page without a recipient ID available for an eligible signed-in member', async () => {
    openUpload('/upload-health-report');
    await screen.findByRole('button', { name: /Submit Health Report/i });
  });

  it('clears the current session before switching to the login screen', async () => {
    axios.get.mockResolvedValue({ data: { ...member, id: 7 } });
    sessionStorage.setItem('user', JSON.stringify({ id: 7 }));
    openUpload();
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in with another account' }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/login?returnTo=%2Fupload-health-report%2F42'));
    expect(axios.post).toHaveBeenCalledWith('/auth/clear-session', {}, { withCredentials: true });
    expect(sessionStorage.getItem('user')).toBeNull();
  });

  it('preserves the report destination when the account is no longer signed in', async () => {
    axios.get.mockRejectedValueOnce({ response: { status: 401 } });
    openUpload('/health-report-upload?userId=42');
    fireEvent.click(await screen.findByRole('button', { name: 'Go to Login' }));
    expect(mockNavigate).toHaveBeenCalledWith('/login?returnTo=%2Fhealth-report-upload%3FuserId%3D42');
  });

  it('refreshes eligibility when a request is no longer active at upload time', async () => {
    axios.get.mockResolvedValueOnce({ data: member }).mockResolvedValueOnce({
      data: { ...member, health_status: 'pending' },
    });
    axios.post.mockRejectedValueOnce({ response: {
      status: 403, data: { error: 'The report is already awaiting review.' },
    } });
    const { container } = openUpload();
    await screen.findByRole('button', { name: /Submit Health Report/i });
    fireEvent.change(container.querySelector('input[type="file"]'), { target: {
      files: [new File(['synthetic'], 'report.pdf', { type: 'application/pdf' })],
    } });
    fireEvent.click(screen.getByRole('button', { name: /Submit Health Report/i }));

    await screen.findByText('No health report upload required');
    expect(screen.getByText(/Your health assessment is pending review/)).toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });
});
