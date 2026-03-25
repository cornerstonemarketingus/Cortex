import { useState } from 'react';

export default function {{COMPONENT_NAME}}() {
  {{STATE_HOOKS}}

  async function {{ACTION_NAME}}() {
    const res = await fetch('{{API_PATH}}', {
      method: '{{HTTP_METHOD}}',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ {{REQUEST_BODY}} })
    });
    const data = await res.json();
    {{RESPONSE_HANDLER}}
  }

  return (
    <div className="space-y-4">
      {{FORM_FIELDS}}
      <button
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        onClick={{{ACTION_NAME}}}
      >
        {{BUTTON_LABEL}}
      </button>
      {{RESULT_RENDER}}
    </div>
  );
}

