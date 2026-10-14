import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { markEmailRead, openEmail, setEmailTab } from '@/redux/slices/myHomeSlice';
import { ageLabel, emailAge, initialsOf } from '@/lib/myHome';
import type { HomeEmail, MyHomeData } from '@/types/myHome.types';
import { selectEmailPanel } from '../selectors';
import { Card, CardHead, Empty, Pill, Segmented } from './ui';

export function AgePill({ email, config }: { email: HomeEmail; config: MyHomeData['config'] }) {
  const { bucket, hours } = emailAge(email, Date.now(), config.emailWarnHours, config.emailSlaHours);
  if (bucket === 'replied') return <Pill tone="ok">Replied</Pill>;
  if (bucket === 'late') return <Pill tone="danger">Late {ageLabel(hours)}</Pill>;
  if (bucket === 'waiting') return <Pill tone="warn">Waiting {ageLabel(hours)}</Pill>;
  return <Pill>{ageLabel(hours)}</Pill>;
}

export function RefPill({ email }: { email: HomeEmail }) {
  if (email.ticketCode) return <Pill tone="code">{email.ticketCode}</Pill>;
  if (email.source === 'lead') return <Pill tone="purple">Lead</Pill>;
  return <Pill>No ticket</Pill>;
}

export default function EmailsPanel({ data }: { data: MyHomeData }) {
  const dispatch = useAppDispatch();
  const tab = useAppSelector((s) => s.myHome.ui.emails.tab);
  const { rows, counts } = useAppSelector(selectEmailPanel);

  const open = (e: HomeEmail) => {
    if (!e.isRead) dispatch(markEmailRead(e));
    dispatch(openEmail(e.id));
  };

  return (
    <Card id="emails" labelledBy="mh-emails-title">
      <CardHead
        id="mh-emails-title"
        title="Client emails"
        sub={`Received from your clients · reply SLA ${data.config.emailSlaHours}h · oldest first`}
      >
        <Segmented
          label="Email filter"
          value={tab}
          onChange={(v) => dispatch(setEmailTab(v))}
          options={[
            { value: 'needs', label: 'Needs reply', count: counts.needs },
            { value: 'replied', label: 'Replied', count: counts.replied },
            { value: 'all', label: 'All', count: counts.all },
          ]}
        />
      </CardHead>
      {rows.length === 0 ? (
        <Empty>Inbox zero for this view.</Empty>
      ) : (
        <ul className="mh-list">
          {rows.map((e) => {
            const late = !e.repliedAt && emailAge(e, Date.now(), data.config.emailWarnHours, data.config.emailSlaHours).bucket === 'late';
            return (
              <li key={e.id} className={late ? 'mh-row late' : 'mh-row'}>
                <span className="mh-unread" style={{ visibility: e.isRead ? 'hidden' : 'visible' }} aria-hidden="true" />
                <div className="mh-avatar sm" aria-hidden="true">
                  {initialsOf(e.fromName || e.fromEmail)}
                </div>
                <button type="button" className="mh-row-main" onClick={() => open(e)}>
                  <div className="mh-ellipsis" style={{ fontWeight: e.isRead ? 500 : 700 }}>
                    {!e.isRead && <span className="sr-only">Unread: </span>}
                    {e.fromName}
                    {e.company && <span className="mh-meta" style={{ fontWeight: 500 }}> · {e.company}</span>}
                  </div>
                  <div className="mh-ellipsis" style={{ fontWeight: 600, fontSize: 13.5 }}>
                    {e.subject}
                  </div>
                  <div className="mh-ellipsis mh-meta">{e.snippet}</div>
                </button>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <RefPill email={e} />
                  <AgePill email={e} config={data.config} />
                  {!e.repliedAt && (
                    <button type="button" className="mh-btn outline sm" onClick={() => open(e)}>
                      Reply
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
