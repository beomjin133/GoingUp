// Asset connection modal

function ConnectAssetModal({ onClose, onConnect, connections = [], onRemoveConnection }) {
  const [category, setCategory] = React.useState("crypto");
  const [provider, setProvider] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [apiSecret, setApiSecret] = React.useState("");
  const [showSecret, setShowSecret] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [confirmDelete, setConfirmDelete] = React.useState(null); // {idx, name}

  const providers = {
    crypto: [
      { id: "upbit", name: "Upbit" },
      { id: "bithumb", name: "Bithumb" },
      { id: "coinone", name: "Coinone" },
      { id: "bybit", name: "Bybit" },
    ],
    equity: [
      { id: "kis", name: "한국투자증권 (KIS)" },
      { id: "ibk", name: "IBK투자증권" },
      { id: "kb", name: "KB증권" },
      { id: "miraeasset", name: "미래에셋증권" },
    ],
  };

  const currentProviders = providers[category];
  const current = currentProviders.find(p => p.id === provider);

  // Lookup provider name by id across both categories
  function providerName(cat, id) {
    return providers[cat]?.find(p => p.id === id)?.name || id;
  }

  React.useEffect(() => {
    setProvider("");
    setApiKey("");
    setApiSecret("");
    setError("");
  }, [category]);

  function maskKey(k) {
    if (!k) return "";
    if (k.length <= 8) return "•".repeat(k.length);
    return k.slice(0, 4) + "••••••••" + k.slice(-4);
  }

  function handleConnect() {
    if (!provider) {
      setError("거래소를 선택하세요");
      return;
    }
    if (!apiKey.trim()) {
      setError("Access key를 입력하세요");
      return;
    }
    if (!apiSecret.trim()) {
      setError("Secret key를 입력하세요");
      return;
    }
    setLoading(true);
    setError("");
    setTimeout(() => {
      setLoading(false);
      onConnect({
        category,
        provider,
        apiKey,
        apiSecret,
        connectedAt: new Date().toISOString(),
      });
      // Reset form for next connection
      setProvider("");
      setApiKey("");
      setApiSecret("");
    }, 600);
  }

  return (
    <>
      <div className="gu-modal-overlay" onClick={onClose}>
        <div className="gu-modal" onClick={e => e.stopPropagation()}>
        <div className="gu-modal-head">
          <h3 className="gu-modal-title">거래소/증권사 연결</h3>
          <button className="gu-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="gu-modal-body">
          {/* Category dropdown */}
          <div className="gu-modal-field">
            <label className="gu-label">자산 종류</label>
            <select className="gu-input" value={category} onChange={e => setCategory(e.target.value)} disabled={loading}>
              <option value="crypto">암호화폐</option>
              <option value="equity">주식</option>
            </select>
          </div>

          {/* Provider dropdown */}
          <div className="gu-modal-field">
            <label className="gu-label">거래소 / 증권사</label>
            <select className="gu-input" value={provider} onChange={e => setProvider(e.target.value)} disabled={loading}>
              <option value="">선택하세요</option>
              {currentProviders.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {provider && (
            <>
              {/* Access Key */}
              <div className="gu-modal-field">
                <label className="gu-label">Access key</label>
                <input type="text" className="gu-input"
                       value={apiKey} onChange={e => setApiKey(e.target.value)}
                       placeholder="Access key를 입력하세요"
                       disabled={loading}/>
              </div>

              {/* Secret Key */}
              <div className="gu-modal-field">
                <label className="gu-label">Secret key</label>
                <div className="gu-input-wrapper">
                  <input type={showSecret ? "text" : "password"} className="gu-input"
                         value={apiSecret} onChange={e => setApiSecret(e.target.value)}
                         placeholder="Secret key를 입력하세요"
                         disabled={loading}/>
                  <button className="gu-input-toggle" onClick={() => setShowSecret(!showSecret)}>
                    <Icon name={showSecret ? "moon" : "sun"} size={13}/>
                  </button>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="gu-modal-error">
              <Icon name="alert" size={14}/>
              {error}
            </div>
          )}

          {/* Connected API list */}
          {connections.length > 0 && (
            <div className="gu-modal-field">
              <label className="gu-label">연결된 API</label>
              <div className="gu-connections-table-wrap">
                <table className="gu-table gu-connections-table">
                  <thead>
                    <tr>
                      <th style={{width: "30%"}}>거래소</th>
                      <th style={{textAlign: "left"}}>Access key</th>
                      <th style={{width: "36px"}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {connections.map((c, i) => (
                      <tr key={i}>
                        <td>
                          <div className="gu-connection-name">{providerName(c.category, c.provider)}</div>
                        </td>
                        <td style={{textAlign: "left"}}>
                          <span className="gu-connection-key gu-num">{maskKey(c.apiKey)}</span>
                        </td>
                        <td>
                          {onRemoveConnection && (
                            <button className="gu-connection-remove" 
                              onClick={() => setConfirmDelete({idx: i, name: providerName(c.category, c.provider)})} 
                              title="연결 해제">
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="gu-modal-note">
            <strong>보안 주의:</strong> API 키와 시크릿은 암호화되어 로컬에만 저장됩니다. 
            외부에 공유하지 마세요.
          </div>
        </div>

        <div className="gu-modal-actions">
          <button className="gu-btn gu-btn-secondary" onClick={onClose} disabled={loading}>
            닫기
          </button>
          <button className="gu-btn gu-btn-primary" onClick={handleConnect} disabled={loading || !provider}>
            {loading ? "연결 중..." : "연결하기"}
          </button>
        </div>
      </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <ConfirmModal
          title="연결 해제"
          message={`${confirmDelete.name} 연결을 해제하시겠습니까?`}
          onConfirm={() => {
            onRemoveConnection(confirmDelete.idx);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}

window.ConnectAssetModal = ConnectAssetModal;
