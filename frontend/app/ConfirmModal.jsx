// Confirmation modal

function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="gu-modal-overlay" onClick={onCancel}>
      <div className="gu-modal gu-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="gu-modal-head">
          <h3 className="gu-modal-title">{title}</h3>
          <button className="gu-modal-close" onClick={onCancel}>✕</button>
        </div>

        <div className="gu-modal-body">
          <p style={{margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--gu-fg2)'}}>
            {message}
          </p>
        </div>

        <div className="gu-modal-actions">
          <button className="gu-btn gu-btn-secondary" onClick={onCancel}>
            취소
          </button>
          <button className="gu-btn gu-btn-primary" onClick={onConfirm} style={{background: 'var(--gu-up)', borderColor: 'var(--gu-up)'}}>
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

window.ConfirmModal = ConfirmModal;
