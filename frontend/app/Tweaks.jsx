// Tweaks panel

function Tweaks({ state, dispatch, onClose }) {
  return (
    <div className="gu-tweaks">
      <div className="gu-tweaks-head">
        <div className="gu-tweaks-title">Tweaks</div>
        <button className="gu-tweaks-close" onClick={onClose}>✕</button>
      </div>

      <div className="gu-tweaks-field">
        <label>디자인 방향</label>
        <div className="gu-tweaks-seg">
          {[
            {id:"conservative", label:"보수적"},
            {id:"balanced", label:"균형"},
            {id:"experimental", label:"실험적"},
          ].map(o => (
            <button key={o.id}
              className={state.variant === o.id ? "is-active" : ""}
              onClick={() => dispatch({type:"set", key:"variant", value:o.id})}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="gu-tweaks-field">
        <label>색상 강도 (상승/하락)</label>
        <div className="gu-tweaks-seg">
          {[
            {id:"subtle", label:"중립적"},
            {id:"bold", label:"강하게"},
          ].map(o => (
            <button key={o.id}
              className={state.intensity === o.id ? "is-active" : ""}
              onClick={() => dispatch({type:"set", key:"intensity", value:o.id})}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="gu-tweaks-field">
        <label>테마</label>
        <div className="gu-tweaks-seg">
          {[
            {id:"light", label:"라이트"},
            {id:"dark", label:"다크"},
          ].map(o => (
            <button key={o.id}
              className={state.theme === o.id ? "is-active" : ""}
              onClick={() => dispatch({type:"set", key:"theme", value:o.id})}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="gu-tweaks-toggle">
        <span>금액 숨기기</span>
        <div className={"gu-switch" + (state.hideAmounts ? " is-on" : "")}
             onClick={() => dispatch({type:"set", key:"hideAmounts", value:!state.hideAmounts})}/>
      </div>
    </div>
  );
}

window.Tweaks = Tweaks;
