import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal } from '../components/primitives';

export function useAuthCtaModal() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return {
    openAuthCta: () => setOpen(true),
    authCtaModal: (
      <Modal
        open={open}
        title="Log in to start tracking"
        description="Create an account to save progress, sync lists, and keep your streak moving."
        onClose={() => setOpen(false)}
      >
        <div className="cc-modal-actions">
          <Button onClick={() => navigate('/login')} autoFocus>
            Log in
          </Button>
          <Button variant="secondary" onClick={() => navigate('/signup')}>
            Create account
          </Button>
        </div>
      </Modal>
    ),
  };
}
