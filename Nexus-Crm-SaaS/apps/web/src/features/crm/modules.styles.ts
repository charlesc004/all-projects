// Shared Tailwind compositions. Marker classes are hooks for contextual variants only.
export const styles = {
  toolbar:
    'crm-toolbar flex items-center gap-3 flex-wrap py-4.5 px-5.5 border-b border-solid border-b-[#edf0f5] [@media(max-width:640px)]:p-[15px]',
  search:
    'crm-search relative min-w-[220px] flex-1 max-w-[340px] [@media(max-width:640px)]:max-w-none [@media(max-width:640px)]:min-w-full [&_svg]:absolute [&_svg]:left-3 [&_svg]:top-[11px] [&_svg]:text-[#94a0b4] [&_input]:pl-9.5! [&_input]:w-full',
  filter:
    'crm-filter min-w-[130px] max-w-[190px] [@media(max-width:640px)]:flex-1 [@media(max-width:640px)]:min-w-[120px]',
  count: 'crm-count text-[#8a94a6] text-[length:12px] ml-[9px] font-medium',
  person: 'crm-person flex items-center gap-[11px]',
  avatar:
    'crm-avatar w-[35px] h-[35px] grid place-items-center shrink-0 bg-[#eeedfd] text-[#6860d8] rounded-[10px] text-[length:11px] font-bold',
  primary: 'crm-primary font-semibold text-[#243149] no-underline [&:hover]:text-[#6960dc]',
  secondary: 'crm-secondary text-[length:12px] text-[#8993a4] mt-1',
  cellActions: 'crm-cellActions flex items-center gap-0.5 justify-end',
  iconButton:
    'crm-iconButton inline-flex items-center justify-center gap-[7px] cursor-pointer border-0 bg-transparent text-[#8b94a5] w-7.5 h-7.5 rounded-[6px] [&:hover]:bg-[#f1f2f8] [&:hover]:text-[#5f58c9] [&:disabled]:opacity-[0.35] [&:disabled]:cursor-not-allowed',
  pagination:
    'crm-pagination flex items-center justify-between py-[17px] px-5.5 text-[length:12px] text-[#8691a3] [@media(max-width:640px)]:p-[15px] [@media(max-width:640px)]:gap-3 [@media(max-width:640px)]:flex-wrap',
  pager: 'crm-pager flex gap-[7px] items-center',
  muted: 'crm-muted text-[#8993a4]',
  pill: "crm-pill inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] py-1 px-2 bg-[#f0f2f6] text-[#647087] text-[length:11px] font-semibold [&:before]:content-[''] [&:before]:h-[5px] [&:before]:w-[5px] [&:before]:rounded-full [&:before]:bg-current",
  green: 'crm-green bg-[#e9f7f1] text-[#2d9d7a]',
  blue: 'crm-blue bg-[#edf2ff] text-[#5d7bce]',
  purple: 'crm-purple bg-[#efedff] text-[#8770ce]',
  orange: 'crm-orange bg-[#fff4e5] text-[#d79a41]',
  red: 'crm-red bg-[#fff0ef] text-[#d57671]',
  formGrid:
    'crm-formGrid grid grid-cols-[1fr_1fr] gap-[17px] [@media(max-width:640px)]:grid-cols-[1fr]',
  fullWidth: 'crm-fullWidth [grid-column:1/-1] [@media(max-width:640px)]:[grid-column:auto]',
  formError: 'crm-formError text-[#c95a60] text-[length:12px] mt-1.5',
  dialogBody: 'crm-dialogBody max-h-[65vh] overflow-y-auto pt-[3px] pr-[3px] pb-[15px] pl-[3px]',
  errorBox: 'crm-errorBox p-7.5 text-center text-[#a14f56] [&_p]:mb-3.5',
  empty:
    'crm-empty py-[65px] px-6 text-center text-[#8a94a6] [&_svg]:mt-auto [&_svg]:mr-auto [&_svg]:mb-3.5 [&_svg]:ml-auto [&_svg]:text-[#bdc4d1] [&_h3]:text-[length:15px] [&_h3]:text-[#455169] [&_h3]:mt-0 [&_h3]:mr-0 [&_h3]:mb-[7px] [&_h3]:ml-0 [&_p]:text-[length:13px] [&_p]:mt-0 [&_p]:mr-0 [&_p]:mb-5 [&_p]:ml-0',
  loading: 'crm-loading p-7.5 grid gap-4',
  skeletonLine:
    'crm-skeletonLine h-10.5 bg-[#f1f3f7] rounded-[7px] animate-[nexus-pulse_1.7s_infinite]',
  detailGrid:
    'crm-detailGrid grid grid-cols-[minmax(0,_1fr)_320px] gap-[23px] [@media(max-width:640px)]:grid-cols-[1fr] [@media(width>640px)_and_(width<=900px)]:grid-cols-[1fr] [@media(width>900px)_and_(width<=1000px)]:grid-cols-[1fr]',
  section:
    'crm-section p-6 border-b border-solid border-b-[#eff1f6] [@media(max-width:640px)]:p-5 [&:last-child]:border-0',
  sectionTitle:
    'crm-sectionTitle text-[length:14px] font-[650] text-[#35415a] mt-0 mr-0 mb-5 ml-0 flex items-center gap-[9px]',
  details: 'crm-details grid grid-cols-[1fr_1fr] gap-5.5 [@media(max-width:640px)]:grid-cols-[1fr]',
  detailLabel:
    'crm-detailLabel text-[length:11px] text-[#949bac] uppercase tracking-[0.04em] mb-[7px]',
  detailValue: 'crm-detailValue text-[length:13px] text-[#40506b] [overflow-wrap:anywhere]',
  note: 'crm-note p-[17px] bg-[#f8f9fc] border border-solid border-[#eef0f5] rounded-[8px] mb-3 [&_p]:whitespace-pre-wrap [&_p]:text-[length:13px] [&_p]:leading-[1.7] [&_p]:my-2 [&_p]:mx-0 [&_p]:text-[#4e5a72]',
  meta: 'crm-meta text-[length:11px] text-[#939daf] flex items-center justify-between gap-2',
  noteForm:
    'crm-noteForm grid gap-2.5 mb-5.5 [&_textarea]:w-full [&_textarea]:min-h-[90px] [&_textarea]:resize-y [&_button]:justify-self-end',
  timeline: 'crm-timeline grid gap-0',
  event:
    "crm-event relative pt-0 pr-0 pb-[25px] pl-[27px] border-l border-solid border-l-[#e8ebf1] ml-[7px] [&:last-child]:border-0 [&:last-child]:pb-0 [&:before]:content-[''] [&:before]:absolute [&:before]:left-[-5px] [&:before]:top-[3px] [&:before]:rounded-full [&:before]:w-[9px] [&:before]:h-[9px] [&:before]:bg-[#9d96e3] [&:before]:border-[2px] [&:before]:border-solid [&:before]:border-[#eeeafd] [&_h4]:text-[length:12px] [&_h4]:font-semibold [&_h4]:mt-0 [&_h4]:mr-0 [&_h4]:mb-1.5 [&_h4]:ml-0 [&_h4]:text-[#54617a] [&_p]:text-[length:12px] [&_p]:text-[#9099aa] [&_p]:leading-[1.6] [&_p]:mt-0 [&_p]:mr-0 [&_p]:mb-1.5 [&_p]:ml-0 [&_time]:text-[length:10px] [&_time]:text-[#a0a8b6]",
  related:
    'crm-related flex items-center justify-between py-[13px] px-0 border-b border-solid border-b-[#f0f2f7] text-[length:13px] [&:last-child]:border-0',
  back: 'crm-back inline-flex gap-1.5 items-center text-[#8a94a5] text-[length:12px] no-underline mb-4.5',
  stats:
    'crm-stats flex gap-[25px] items-center [@media(max-width:640px)]:gap-[15px] [@media(max-width:640px)]:hidden [@media(width>640px)_and_(width<=900px)]:gap-[15px] [@media(width>900px)_and_(width<=1000px)]:gap-[15px]',
  statLabel: 'crm-statLabel text-[length:11px] text-[#9aa3b3] mb-[5px]',
  statValue: 'crm-statValue text-[length:21px] font-[650] text-[#2f3e58]',
  board:
    'crm-board grid grid-cols-[repeat(6,_minmax(235px,_1fr))] gap-[15px] overflow-x-auto pb-4 [@media(max-width:640px)]:grid-cols-[repeat(6,_250px)] [@media(width>640px)_and_(width<=900px)]:grid-cols-[repeat(6,_250px)] [@media(width>900px)_and_(width<=1000px)]:grid-cols-[repeat(6,_250px)]',
  column: 'crm-column rounded-[9px] bg-[#eff1f6] min-h-[370px] p-3',
  columnHeader:
    'crm-columnHeader flex items-center justify-between pt-1.5 pr-1 pb-[15px] pl-1 text-[length:12px] font-semibold text-[#69768d]',
  columnTotal: 'crm-columnTotal text-[length:10px] text-[#99a1af] pt-0 pr-1 pb-[17px] pl-1',
  dealCard:
    'crm-dealCard p-[17px] bg-white border border-solid border-[#e5e8ef] rounded-[8px] mb-2.5 shadow-[0_2px_2px_#1c285003] [&_h3]:text-[length:13px] [&_h3]:mt-0 [&_h3]:mr-0 [&_h3]:mb-[7px] [&_h3]:ml-0 [&_h3]:text-[#43506a] [&_h3]:leading-[1.6]',
  dealValue: 'crm-dealValue text-[length:17px] font-semibold text-[#3b4963] my-[17px] mx-0',
  dealFooter:
    'crm-dealFooter flex items-center justify-between text-[length:10px] text-[#97a0b1] border-t border-solid border-t-[#f0f1f5] pt-3 mb-[11px]',
  stageSelect:
    'crm-stageSelect w-full text-[length:10px]! min-h-[30px]! py-[5px]! px-2! [&:disabled]:opacity-[0.6] [&:disabled]:cursor-not-allowed',
  tabs: 'crm-tabs flex gap-[25px] border-b border-solid border-b-[#e8ebf1] py-0 px-5.5 overflow-x-auto [@media(max-width:640px)]:gap-5 [@media(max-width:640px)]:py-0 [@media(max-width:640px)]:px-[17px]',
  tab: 'crm-tab pt-[19px] pr-0 pb-[17px] pl-0 text-[length:12px] font-[550] text-[#929bab] border-0 bg-transparent whitespace-nowrap border-b-[2px] border-solid border-b-transparent cursor-pointer',
  activeTab: 'crm-activeTab text-[#6c63d9] border-b-[#7167de]',
  taskCheck:
    'crm-taskCheck border-[1.5px] border-solid border-[#d8dce6] rounded-full w-[21px] h-[21px] grid place-items-center bg-white text-white cursor-pointer shrink-0 [&:disabled]:opacity-[0.35] [&:disabled]:cursor-not-allowed',
  checked: 'crm-checked bg-[#8176df] border-[#8176df]',
  taskTitleDone: 'crm-taskTitleDone line-through text-[#9ba2b1]',
  overdue: 'crm-overdue text-[#d67975]',
  notification:
    'crm-notification flex gap-[17px] p-[23px] border-b border-solid border-b-[#eff1f6] items-start [&:last-child]:border-0',
  unread: 'crm-unread bg-[#fbfaff]',
  notificationIcon:
    'crm-notificationIcon h-9.5 w-9.5 shrink-0 grid place-items-center text-[#8575da] bg-[#efedfa] rounded-[11px]',
  notificationContent:
    'crm-notificationContent flex-1 [&_h3]:text-[length:13px] [&_h3]:text-[#46516a] [&_h3]:mt-0 [&_h3]:mr-0 [&_h3]:mb-[7px] [&_h3]:ml-0 [&_p]:text-[length:12px] [&_p]:text-[#929bac] [&_p]:leading-[1.7] [&_p]:mt-0 [&_p]:mr-0 [&_p]:mb-2 [&_p]:ml-0',
  settingsCard: 'crm-settingsCard max-w-[820px]',
  settingsBody: 'crm-settingsBody p-[27px] [@media(max-width:640px)]:p-5',
  settingsDescription:
    'crm-settingsDescription text-[length:12px] text-[#929bae] leading-[1.7] mt-[-8px] mr-0 mb-[25px] ml-0',
  settingsFooter:
    'crm-settingsFooter border-t border-solid border-t-[#eef0f5] mt-[25px] pt-5 flex justify-end',
  dangerText: 'crm-dangerText text-[length:12px] text-[#a66267] leading-[1.7]',
  banner:
    'crm-banner border border-solid border-[#e8e2fa] bg-[#f5f2fc] rounded-[8px] py-[15px] px-4.5 text-[length:12px] leading-[1.7] text-[#8170af] mb-6',
  confirmation: 'crm-confirmation text-[length:13px] text-[#8490a6] leading-[1.8]',
  toolbarRight: 'crm-toolbarRight ml-auto flex gap-2',
  sort: 'crm-sort cursor-pointer bg-transparent border-0 [font:inherit] text-inherit inline-flex items-center gap-[7px]',
  select: 'crm-select w-full',
  nowrap: 'crm-nowrap whitespace-nowrap',
  table:
    'crm-table w-full border-collapse text-left text-[length:12px] [&_th]:text-[length:10px] [&_th]:uppercase [&_th]:tracking-[0.05em] [&_th]:font-semibold [&_th]:text-[#9ba3b2] [&_th]:py-3.5 [&_th]:px-5.5 [&_th]:border-b [&_th]:border-solid [&_th]:border-b-[#edf0f5] [&_th]:bg-[#fdfdfe] [&_th]:whitespace-nowrap [@media(max-width:640px)]:[&_th]:p-[15px] [&_td]:py-[17px] [&_td]:px-5.5 [&_td]:border-b [&_td]:border-solid [&_td]:border-b-[#f0f2f6] [&_td]:text-[#6d7a90] [@media(max-width:640px)]:[&_td]:p-[15px] [&_tr:last-child_td]:border-b-0 [&_tbody_tr:hover]:bg-[#fcfcff]',
  tableWrap: 'crm-tableWrap overflow-x-auto [@media(max-width:640px)]:relative',
  message: 'crm-message text-[length:12px] leading-[1.8] text-[#8b95a8]',
  pageActions: 'crm-pageActions flex gap-2 flex-wrap',
  relationTitle: 'crm-relationTitle flex items-center gap-[9px] [&_svg]:text-[#a29bb9]',
} as const;
export default styles;
