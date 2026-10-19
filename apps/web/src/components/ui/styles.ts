// Shared Tailwind compositions. Marker classes are hooks for contextual variants only.
export const ui = {
  document:
    '[:where(&,_&_*)]:box-border m-0 bg-background text-foreground font-sans text-[length:13px] antialiased [:where(&)_a]:text-inherit [:where(&)_a]:no-underline [:where(&)_a]:outline-offset-[4px] [:where(&)_button]:[font:inherit] [:where(&)_button]:outline-offset-[4px] [:where(&)_button]:cursor-pointer [:where(&)_input]:[font:inherit] [:where(&)_input]:outline-offset-[4px] [:where(&)_select]:[font:inherit] [:where(&)_select]:outline-offset-[4px] [:where(&)_textarea]:[font:inherit] [:where(&)_textarea]:outline-offset-[4px] [:where(&)_button:disabled]:cursor-not-allowed [:where(&)_button:disabled]:opacity-[0.5] [:where(&)_button:focus-visible]:outline-[2px] [:where(&)_button:focus-visible]:outline-solid [:where(&)_button:focus-visible]:outline-[#9088ef] [:where(&)_a:focus-visible]:outline-[2px] [:where(&)_a:focus-visible]:outline-solid [:where(&)_a:focus-visible]:outline-[#9088ef] [:where(&)_input:focus]:outline-[2px] [:where(&)_input:focus]:outline-solid [:where(&)_input:focus]:outline-[#d5d0ff] [:where(&)_input:focus]:border-[#9389ed] [:where(&)_select:focus]:outline-[2px] [:where(&)_select:focus]:outline-solid [:where(&)_select:focus]:outline-[#d5d0ff] [:where(&)_select:focus]:border-[#9389ed] [:where(&)_textarea:focus]:outline-[2px] [:where(&)_textarea:focus]:outline-solid [:where(&)_textarea:focus]:outline-[#d5d0ff] [:where(&)_textarea:focus]:border-[#9389ed] [:where(&)_h1]:m-0 [:where(&)_h1]:font-semibold [:where(&)_h1]:tracking-[-0.025em] [:where(&)_h2]:m-0 [:where(&)_h2]:font-semibold [:where(&)_h2]:tracking-[-0.025em] [:where(&)_h3]:m-0 [:where(&)_h3]:font-semibold [:where(&)_h3]:tracking-[-0.025em] [:where(&)_p]:m-0 [:where(&)_svg]:shrink-0',
  'text-muted': 'nexus-text-muted text-muted-foreground',
  'text-sm': 'nexus-text-sm text-[length:12px]',
  'text-right': 'nexus-text-right text-right',
  'font-medium': 'nexus-font-medium font-semibold',
  'sr-only': 'nexus-sr-only sr-only',
  'skip-link':
    'nexus-skip-link fixed left-3 top-[-60px] z-[120] bg-white text-[#5951c9] py-3 px-4.5 rounded-[6px] shadow-[0_4px_20px_#151c2e30] [&:focus]:top-3',
  btn: 'nexus-btn inline-flex items-center justify-center gap-2 h-[37px] border border-solid border-transparent rounded-[7px] py-0 px-[13px] whitespace-nowrap text-[length:12px] font-semibold [transition:background_0.15s,_box-shadow_0.15s]',
  'btn-default':
    'nexus-btn-default bg-primary text-white shadow-[0_2px_3px_#27214b0e] [&:hover]:bg-[#5951c9]',
  'btn-outline':
    'nexus-btn-outline bg-white border-[#e2e5ed] text-[#555d6e] shadow-[0_1px_2px_#20273804] [&:hover]:bg-[#f8f8fc] [&:hover]:border-[#d6d8e2]',
  'btn-secondary':
    'nexus-btn-secondary bg-white border-[#e2e5ed] text-[#555d6e] shadow-[0_1px_2px_#20273804] [&:hover]:bg-[#f8f8fc] [&:hover]:border-[#d6d8e2]',
  'btn-ghost':
    'nexus-btn-ghost bg-transparent text-muted-foreground [&:hover]:bg-[#eef0f6] [&:hover]:text-[#343d52]',
  'btn-destructive': 'nexus-btn-destructive bg-[#dc5252] text-white',
  'btn-sm': 'nexus-btn-sm h-[31px] py-0 px-2.5 text-[length:11px]',
  'btn-lg': 'nexus-btn-lg h-11 py-0 px-5',
  'btn-icon': 'nexus-btn-icon h-[35px] w-[35px] p-0',
  input:
    'nexus-input w-full h-[39px] border border-solid border-[#e2e5ee] rounded-[7px] py-0 px-3 text-[#424b60] bg-white [transition:border-color_0.15s] [&::placeholder]:text-muted-foreground',
  select:
    'nexus-select w-full h-[39px] border border-solid border-[#e2e5ee] rounded-[7px] py-0 px-3 text-[#424b60] bg-white [transition:border-color_0.15s] appearance-auto',
  field: 'nexus-field flex flex-col gap-[7px]',
  'form-label': 'nexus-form-label block text-[length:12px] font-semibold text-[#4f586d] mb-[7px]',
  'form-error': 'nexus-form-error text-[length:11px] text-[#a14049] mt-1.5',
  badge:
    'nexus-badge inline-flex items-center justify-center gap-[5px] rounded-[5px] py-1 px-2 text-[length:10px] leading-[1.2] font-semibold bg-[#f0eefe] text-[#6250ac] whitespace-nowrap',
  'badge-success': 'nexus-badge-success bg-[#e9f7f0] text-[#267453]',
  'badge-green': 'nexus-badge-green bg-[#e9f7f0] text-[#267453]',
  'badge-warning': 'nexus-badge-warning bg-[#fff5e8] text-[#946212]',
  'badge-orange': 'nexus-badge-orange bg-[#fff5e8] text-[#946212]',
  'badge-danger': 'nexus-badge-danger bg-[#feeeee] text-[#aa4149]',
  'badge-red': 'nexus-badge-red bg-[#feeeee] text-[#aa4149]',
  'badge-destructive': 'nexus-badge-destructive bg-[#feeeee] text-[#aa4149]',
  'badge-blue': 'nexus-badge-blue bg-[#eaf2ff] text-[#3f659f]',
  'badge-secondary': 'nexus-badge-secondary bg-[#f0f2f6] text-[#606a7e]',
  'badge-gray': 'nexus-badge-gray bg-[#f0f2f6] text-[#606a7e]',
  'badge-outline': 'nexus-badge-outline bg-[#f0f2f6] text-[#606a7e]',
  card: 'nexus-card bg-white border border-solid border-border rounded-[11px] shadow-[0_2px_3px_#1f294202] overflow-hidden',
  'card-header':
    'nexus-card-header flex items-center justify-between pt-5.5 pr-[23px] pb-0 pl-[23px] gap-4 [@media(max-width:640px)]:pt-4.5 [@media(max-width:640px)]:pr-4.5 [@media(max-width:640px)]:pb-0 [@media(max-width:640px)]:pl-4.5 [@media(width>640px)_and_(width<=900px)]:pt-4.5 [@media(width>640px)_and_(width<=900px)]:pr-4.5 [@media(width>640px)_and_(width<=900px)]:pb-0 [@media(width>640px)_and_(width<=900px)]:pl-4.5 [@media(width>900px)_and_(width<=1000px)]:pt-4.5 [@media(width>900px)_and_(width<=1000px)]:pr-4.5 [@media(width>900px)_and_(width<=1000px)]:pb-0 [@media(width>900px)_and_(width<=1000px)]:pl-4.5 [@media(width>1000px)_and_(width<=1100px)]:pt-4.5 [@media(width>1000px)_and_(width<=1100px)]:pr-4.5 [@media(width>1000px)_and_(width<=1100px)]:pb-0 [@media(width>1000px)_and_(width<=1100px)]:pl-4.5',
  'card-title': 'nexus-card-title text-[length:14px] font-semibold tracking-[-0.02em]',
  'card-description':
    'nexus-card-description text-[length:11px] text-muted-foreground mt-1.5 leading-[1.6]',
  'card-content':
    'nexus-card-content py-5.5 px-[23px] [@media(max-width:640px)]:p-4.5 [@media(width>640px)_and_(width<=900px)]:p-4.5 [@media(width>900px)_and_(width<=1000px)]:p-4.5 [@media(width>1000px)_and_(width<=1100px)]:p-4.5',
  'page-header':
    'nexus-page-header flex justify-between items-center gap-4 mb-[25px] [@media(max-width:640px)]:items-start [@media(max-width:640px)]:flex-col [@media(max-width:640px)]:gap-[17px] [@media(max-width:640px)]:mb-[21px]',
  'page-title':
    'nexus-page-title text-[length:25px] font-semibold tracking-[-0.04em] leading-[1.3] [@media(max-width:640px)]:text-[length:25px] [@media(width>640px)_and_(width<=900px)]:text-[length:24px]',
  'page-description':
    'nexus-page-description text-[length:12px] text-muted-foreground mt-2 leading-[1.6]',
  'page-actions':
    'nexus-page-actions flex items-center gap-2.5 flex-wrap [@media(max-width:640px)]:w-full [@media(max-width:640px)]:[&_.nexus-btn]:grow-0',
  avatar:
    'nexus-avatar inline-flex shrink-0 items-center justify-center w-8 h-8 rounded-full bg-[#eeeafb] text-[#67518e] text-[length:10px] font-semibold border border-solid border-[#ffffff60]',
  'avatar-small': 'nexus-avatar-small w-6.5 h-6.5 text-[length:9px]',
  'table-wrap': 'nexus-table-wrap overflow-auto',
  'data-table':
    'nexus-data-table w-full border-collapse text-left whitespace-nowrap [&_th]:bg-[#fafbfc] [&_th]:text-muted-foreground [&_th]:text-[length:10px] [&_th]:font-medium [&_th]:py-[13px] [&_th]:px-[21px] [&_th]:border-b [&_th]:border-solid [&_th]:border-b-border [@media(max-width:640px)]:[&_th]:pl-4 [@media(max-width:640px)]:[&_th]:pr-4 [@media(width>640px)_and_(width<=900px)]:[&_th]:pl-4 [@media(width>640px)_and_(width<=900px)]:[&_th]:pr-4 [@media(width>900px)_and_(width<=1000px)]:[&_th]:pl-4 [@media(width>900px)_and_(width<=1000px)]:[&_th]:pr-4 [@media(width>1000px)_and_(width<=1100px)]:[&_th]:pl-4 [@media(width>1000px)_and_(width<=1100px)]:[&_th]:pr-4 [&_td]:py-[15px] [&_td]:px-[21px] [&_td]:border-b [&_td]:border-solid [&_td]:border-b-[#f0f1f5] [&_td]:text-[length:11px] [&_td]:text-muted-foreground [@media(max-width:640px)]:[&_td]:pl-4 [@media(max-width:640px)]:[&_td]:pr-4 [@media(width>640px)_and_(width<=900px)]:[&_td]:pl-4 [@media(width>640px)_and_(width<=900px)]:[&_td]:pr-4 [@media(width>900px)_and_(width<=1000px)]:[&_td]:pl-4 [@media(width>900px)_and_(width<=1000px)]:[&_td]:pr-4 [@media(width>1000px)_and_(width<=1100px)]:[&_td]:pl-4 [@media(width>1000px)_and_(width<=1100px)]:[&_td]:pr-4 [&_tr:last-child_td]:border-b-0 [&_tbody_tr:hover]:bg-[#fcfcfe] [&_.nexus-primary-text]:text-[#3b4357] [&_.nexus-primary-text]:text-[length:11px] [&_.nexus-primary-text]:font-semibold',
  'primary-text': 'nexus-primary-text ',
  'empty-state':
    'nexus-empty-state py-[45px] px-5 flex items-center flex-col gap-3 text-center text-muted-foreground [&_h3]:text-[length:14px] [&_h3]:text-[#4e586e] [&_p]:text-[length:12px] [&_p]:max-w-[420px] [&_p]:leading-[1.7]',
  'empty-icon':
    'nexus-empty-icon w-12 h-12 rounded-[12px] grid place-items-center bg-[#f3f1fe] text-[#a298df]',
  'error-state': 'nexus-error-state text-[#a14049]',
  skeleton:
    'nexus-skeleton max-w-full bg-[linear-gradient(100deg,_#eef0f5_30%,_#f7f8fb_50%,_#eef0f5_70%)] [background-size:250%_100%] animate-[nexus-shimmer_1.8s_infinite] rounded-[10px]',
  'dialog-overlay':
    'nexus-dialog-overlay fixed inset-0 z-[100] bg-[#11182c70] [backdrop-filter:blur(3px)] animate-[nexus-fade-in_0.15s]',
  'dialog-content':
    'nexus-dialog-content fixed z-[101] left-1/2 top-1/2 [transform:translate(-50%,_-50%)] w-[calc(100%_-_36px)] max-w-[530px] bg-white rounded-[14px] border border-solid border-[#e5e7ef] p-6.5 shadow-[0_25px_100px_#13192d40] max-h-[90vh] overflow-y-auto [@media(max-width:640px)]:p-5.5',
  'dialog-header': 'nexus-dialog-header pr-5 mb-[23px]',
  'dialog-title': 'nexus-dialog-title text-[length:19px]',
  'dialog-description':
    'nexus-dialog-description text-[length:12px] text-muted-foreground leading-[1.7] mt-[7px]',
  'dialog-footer': 'nexus-dialog-footer flex justify-end gap-[9px] mt-6',
  'dialog-x':
    'nexus-dialog-x absolute right-[17px] top-[17px] border-0 bg-transparent text-[#9298a6] p-[5px] rounded-[5px]',
  'dropdown-content':
    'nexus-dropdown-content z-[110] min-w-[180px] p-1.5 border border-solid border-[#e5e7ef] bg-white rounded-[10px] shadow-[0_10px_40px_#1b24451c] animate-[nexus-fade-in_0.12s] max-h-[80vh] overflow-auto',
  'dropdown-item':
    'nexus-dropdown-item flex items-center gap-[9px] min-h-[34px] py-2 px-2.5 text-[length:12px] rounded-[5px] outline-none cursor-pointer text-[#60697c] [&[data-highlighted]]:bg-[#f2f0ff] [&[data-highlighted]]:text-[#6250ac]',
  'dropdown-separator': 'nexus-dropdown-separator h-[1px] bg-[#eceef3] my-[5px] mx-0',
  'app-shell': 'nexus-app-shell min-h-screen',
  sidebar:
    'nexus-sidebar overflow-y-auto overflow-x-clip fixed left-0 top-0 bottom-0 w-[224px] bg-navy text-[#8e96ad] flex flex-col pt-7.5 pr-4 pb-4 pl-4 z-[50] [transition:width_0.2s,_transform_0.2s] [@media(width>640px)_and_(width<=900px)]:w-19 [@media(width>640px)_and_(width<=900px)]:pl-[11px] [@media(width>640px)_and_(width<=900px)]:pr-[11px] [@media(width>900px)_and_(width<=1000px)]:w-[200px] [@media(width>900px)_and_(width<=1000px)]:pl-3 [@media(width>900px)_and_(width<=1000px)]:pr-3 [@media(width>1000px)_and_(width<=1100px)]:w-[200px] [@media(width>1000px)_and_(width<=1100px)]:pl-3 [@media(width>1000px)_and_(width<=1100px)]:pr-3 [@media(min-width:1450px)]:w-[240px] [@media(width>640px)_and_(width<=900px)]:[&_.nexus-brand]:pt-0 [@media(width>640px)_and_(width<=900px)]:[&_.nexus-brand]:pr-3 [@media(width>640px)_and_(width<=900px)]:[&_.nexus-brand]:pb-8 [@media(width>640px)_and_(width<=900px)]:[&_.nexus-brand]:pl-3 [@media(width>640px)_and_(width<=900px)]:[&_.nexus-brand-name]:hidden [@media(width>640px)_and_(width<=900px)]:[&_.nexus-workspace-switch]:hidden [@media(width>640px)_and_(width<=900px)]:[&_.nexus-nav-label]:hidden [@media(width>640px)_and_(width<=900px)]:[&_.nexus-nav-text]:hidden [@media(width>640px)_and_(width<=900px)]:[&_.nexus-nav-count]:hidden [@media(width>640px)_and_(width<=900px)]:[&_.nexus-sidebar-help]:hidden [@media(width>640px)_and_(width<=900px)]:[&_.nexus-profile-copy]:hidden [@media(width>640px)_and_(width<=900px)]:[&_.nexus-profile-chevron]:hidden [@media(width>640px)_and_(width<=900px)]:[&_.nexus-nav-item]:justify-center [@media(width>640px)_and_(width<=900px)]:[&_.nexus-nav-item]:p-[13px] [@media(width>640px)_and_(width<=900px)]:[&_.nexus-sidebar-profile]:justify-center [@media(max-width:640px)]:hidden',
  brand: 'nexus-brand flex items-center gap-2.5 pt-0 pr-3 pb-7.5 pl-3 text-white whitespace-nowrap',
  'brand-name': 'nexus-brand-name text-[length:24px] font-semibold tracking-[-1px]',
  'brand-dot': 'nexus-brand-dot text-[#998af6]',
  'logo-symbol': 'nexus-logo-symbol text-[#a499f4] w-[29px] h-[29px]',
  'workspace-switch':
    'nexus-workspace-switch flex items-center gap-2.5 bg-[#1e263a] border border-solid border-[#30384d] rounded-[8px] py-2.5 px-[11px] text-[#d9dce7] mt-0 mr-[1px] mb-[27px] ml-[1px] text-[length:11px] [&_small]:block [&_small]:text-[length:9px] [&_small]:text-[#9ba5ba] [&_small]:mt-1',
  'workspace-logo':
    'nexus-workspace-logo w-7 h-7 grid place-items-center bg-[#30374f] rounded-[6px] text-[#bac1d9] font-semibold text-[length:11px]',
  'nav-label':
    'nexus-nav-label text-[length:9px] tracking-[1.6px] font-semibold mt-0 mr-3.5 mb-[11px] ml-3.5 text-[#9ba5ba]',
  'nav-items': 'nexus-nav-items flex flex-col gap-1',
  'nav-item':
    "nexus-nav-item flex items-center gap-3 py-[11px] px-3.5 rounded-[6px] text-[length:11px] font-medium text-[#8c96ad] whitespace-nowrap relative [&:hover]:bg-[#20283e] [&:hover]:text-[#c7cce0] [&.nexus-active]:text-[#ded9ff] [&.nexus-active]:bg-[#2d2d4a] [&.nexus-active:before]:content-[''] [&.nexus-active:before]:h-4 [&.nexus-active:before]:absolute [&.nexus-active:before]:left-[-16px] [&.nexus-active:before]:top-3 [&.nexus-active:before]:w-[3px] [&.nexus-active:before]:bg-[#a392f1] [&.nexus-active:before]:rounded-[0_3px_3px_0] [&.nexus-active_svg]:text-[#b4a4ff] [&_svg]:w-4 [&_svg]:h-4",
  active: 'nexus-active ',
  'nav-count':
    'nexus-nav-count text-[length:9px] py-0.5 px-1.5 ml-auto bg-[#3b375b] rounded-[4px] text-[#b2a7df]',
  'nav-spacer': 'nexus-nav-spacer h-[27px]',
  'sidebar-bottom': 'nexus-sidebar-bottom mt-auto pt-[25px]',
  'sidebar-help':
    'nexus-sidebar-help mt-[17px] mr-0.5 mb-[13px] ml-0.5 py-4 px-[13px] bg-[#1d2539] border border-solid border-[#2d354c] rounded-[9px] [&_p]:text-[length:10px] [&_p]:leading-[1.7] [&_p]:text-[#9ba5ba] [&_a]:flex [&_a]:gap-[7px] [&_a]:items-center [&_a]:text-[#a99ae9] [&_a]:text-[length:10px] [&_a]:font-semibold [&_a]:mt-[13px]',
  'sidebar-help-title':
    'nexus-sidebar-help-title text-[length:11px] text-[#d1d5e4] mt-2.5 mr-0 mb-1.5 ml-0',
  'sidebar-profile':
    'nexus-sidebar-profile flex items-center gap-2.5 w-full pt-[13px] pr-[7px] pb-0 pl-[7px] border-t border-solid border-t-[#2a3246] bg-transparent border-l-0 border-r-0 border-b-0 text-left text-[#c4cadd] [&_.nexus-avatar]:bg-[#383349] [&_.nexus-avatar]:text-[#d4bfad] [&_.nexus-avatar]:border [&_.nexus-avatar]:border-solid [&_.nexus-avatar]:border-[#625344]',
  'profile-name': 'nexus-profile-name text-[length:11px] font-semibold',
  'profile-role': 'nexus-profile-role text-[length:9px] text-[#9ba5ba] mt-1',
  'main-container':
    'nexus-main-container ml-[224px] [transition:margin-left_0.2s] [@media(max-width:640px)]:ml-0 [@media(width>640px)_and_(width<=900px)]:ml-19 [@media(width>900px)_and_(width<=1000px)]:ml-[200px] [@media(width>1000px)_and_(width<=1100px)]:ml-[200px] [@media(min-width:1450px)]:ml-[240px]',
  topbar:
    'nexus-topbar h-19 bg-white border-b border-solid border-b-border flex items-center justify-between py-0 px-8 gap-6 [@media(max-width:640px)]:h-15.5 [@media(max-width:640px)]:py-0 [@media(max-width:640px)]:px-4 [@media(max-width:640px)]:gap-2.5 [@media(width>640px)_and_(width<=900px)]:py-0 [@media(width>640px)_and_(width<=900px)]:px-[23px] [@media(width>900px)_and_(width<=1000px)]:py-0 [@media(width>900px)_and_(width<=1000px)]:px-[23px] [@media(width>1000px)_and_(width<=1100px)]:py-0 [@media(width>1000px)_and_(width<=1100px)]:px-[23px] [@media(min-width:1450px)]:py-0 [@media(min-width:1450px)]:px-10.5 [@media(max-width:640px)]:[&_.nexus-avatar]:w-[29px] [@media(max-width:640px)]:[&_.nexus-avatar]:h-[29px]',
  breadcrumb:
    'nexus-breadcrumb flex items-center gap-2.5 text-[length:11px] text-muted-foreground [@media(max-width:640px)]:text-[length:10px] [@media(max-width:640px)]:gap-1.5 [&_strong]:font-medium [&_strong]:text-[#566074] [@media(max-width:640px)]:[&_>_a:first-child]:hidden [@media(max-width:640px)]:[&_.nexus-breadcrumb-home-divider]:hidden',
  'topbar-actions':
    'nexus-topbar-actions flex items-center gap-4.5 [@media(max-width:640px)]:gap-[5px] [@media(width>640px)_and_(width<=900px)]:gap-2.5 [@media(width>900px)_and_(width<=1000px)]:gap-2.5 [@media(width>1000px)_and_(width<=1100px)]:gap-2.5',
  'topbar-search':
    'nexus-topbar-search flex items-center gap-[9px] min-w-[225px] border-0 bg-transparent text-[length:11px] text-muted-foreground text-left [@media(max-width:640px)]:min-w-0 [@media(max-width:640px)]:p-2 [@media(width>640px)_and_(width<=900px)]:min-w-[170px] [@media(width>900px)_and_(width<=1000px)]:min-w-[170px] [@media(width>1000px)_and_(width<=1100px)]:min-w-[170px] [&_kbd]:ml-auto [&_kbd]:bg-[#f9fafb] [&_kbd]:border [&_kbd]:border-solid [&_kbd]:border-[#e8eaf0] [&_kbd]:rounded-[4px] [&_kbd]:py-[3px] [&_kbd]:px-[5px] [&_kbd]:text-[length:9px] [&_kbd]:text-muted-foreground [@media(max-width:640px)]:[&_kbd]:hidden [@media(max-width:640px)]:[&_span]:hidden',
  'notification-trigger': 'nexus-notification-trigger relative',
  'notification-dot':
    'nexus-notification-dot absolute w-[5px] h-[5px] rounded-full bg-[#e49b8e] right-2 top-[5px] border border-solid border-white',
  'topbar-divider':
    'nexus-topbar-divider h-[23px] w-[1px] bg-border [@media(max-width:640px)]:hidden',
  'main-content':
    'nexus-main-content pt-[31px] pr-8 pb-9 pl-8 max-w-[1660px] my-0 mx-auto [@media(max-width:640px)]:py-[23px] [@media(max-width:640px)]:px-4 [@media(width>640px)_and_(width<=900px)]:py-6.5 [@media(width>640px)_and_(width<=900px)]:px-[23px] [@media(width>900px)_and_(width<=1000px)]:py-6.5 [@media(width>900px)_and_(width<=1000px)]:px-[23px] [@media(width>1000px)_and_(width<=1100px)]:py-6.5 [@media(width>1000px)_and_(width<=1100px)]:px-[23px] [@media(min-width:1450px)]:py-9 [@media(min-width:1450px)]:px-10.5',
  'shell-collapsed':
    'nexus-shell-collapsed [&_.nexus-sidebar]:w-19 [&_.nexus-sidebar]:pl-[11px] [&_.nexus-sidebar]:pr-[11px] [&_.nexus-brand]:pt-0 [&_.nexus-brand]:pr-3 [&_.nexus-brand]:pb-8 [&_.nexus-brand]:pl-3 [&_.nexus-brand-name]:hidden [&_.nexus-workspace-switch]:hidden [&_.nexus-nav-label]:hidden [&_.nexus-nav-text]:hidden [&_.nexus-nav-count]:hidden [&_.nexus-sidebar-help]:hidden [&_.nexus-profile-copy]:hidden [&_.nexus-profile-chevron]:hidden [&_.nexus-nav-item]:justify-center [&_.nexus-nav-item]:p-[13px] [&_.nexus-sidebar-profile]:justify-center [&_.nexus-main-container]:ml-19 [@media(max-width:640px)]:[&_.nexus-main-container]:ml-0 [&_.nexus-sidebar-collapse]:top-[73px] [&_.nexus-sidebar-collapse]:right-[9px]',
  'nav-text': 'nexus-nav-text ',
  'profile-copy': 'nexus-profile-copy ',
  'profile-chevron': 'nexus-profile-chevron ',
  'sidebar-collapse':
    'nexus-sidebar-collapse absolute right-[9px] top-8.5 bg-[#1e263a] border border-solid border-[#343c52] w-5.5 h-5.5 grid place-items-center rounded-full text-[#8f96a9] [@media(max-width:640px)]:hidden [@media(width>640px)_and_(width<=900px)]:hidden',
  'mobile-toggle': 'nexus-mobile-toggle hidden [@media(max-width:640px)]:inline-flex',
  'mobile-overlay':
    'nexus-mobile-overlay hidden [@media(max-width:640px)]:block [@media(max-width:640px)]:fixed [@media(max-width:640px)]:inset-0 [@media(max-width:640px)]:bg-[#11182c80] [@media(max-width:640px)]:z-[40]',
  'mobile-drawer':
    'nexus-mobile-drawer [@media(max-width:640px)]:flex! [@media(max-width:640px)]:w-[min(288px,calc(100vw_-_48px))] [@media(max-width:640px)]:pt-[max(24px,env(safe-area-inset-top))] [@media(max-width:640px)]:pb-[max(16px,env(safe-area-inset-bottom))] [@media(max-width:640px)]:max-h-dvh [@media(max-width:640px)]:overscroll-contain [@media(max-width:640px)]:[&>*]:shrink-0 [@media(max-width:640px)]:[&_.nexus-nav-item]:min-h-11 [@media(max-width:640px)]:[&_.nexus-nav-item]:text-[length:12px] [@media(max-width:640px)]:[&_.nexus-sidebar-help]:hidden',
  'mobile-close':
    'nexus-mobile-close hidden [@media(max-width:640px)]:grid [@media(max-width:640px)]:place-items-center [@media(max-width:640px)]:absolute [@media(max-width:640px)]:right-3 [@media(max-width:640px)]:top-[max(16px,env(safe-area-inset-top))] [@media(max-width:640px)]:size-11 [@media(max-width:640px)]:rounded-lg [@media(max-width:640px)]:text-[#c4cadd] [@media(max-width:640px)]:hover:bg-[#20283e]',
  'notifications-menu':
    'nexus-notifications-menu w-[350px] p-0 [@media(max-width:640px)]:w-[310px]',
  'menu-heading':
    'nexus-menu-heading flex justify-between items-center p-4 border-b border-solid border-b-border [&_h3]:text-[length:13px]',
  'notification-item':
    'nexus-notification-item py-[13px] px-4 flex items-start gap-2.5 border-b border-solid border-b-[#f2f3f6] cursor-pointer [&.nexus-unread]:bg-[#f9f8ff] [&_strong]:block [&_strong]:text-[#4f586a] [&_strong]:text-[length:11px] [&_strong]:font-semibold [&_p]:text-[length:10px] [&_p]:leading-[1.7] [&_p]:mt-1 [&_p]:text-muted-foreground [&_small]:text-[length:9px] [&_small]:text-muted-foreground',
  unread: 'nexus-unread ',
  'notification-mark':
    'nexus-notification-mark w-[7px] h-[7px] bg-[#8f81e5] rounded-full mt-1 shrink-0',
  'menu-footer':
    'nexus-menu-footer block p-[13px] text-center text-[length:11px] font-semibold text-[#6652ac]',
  'search-dialog': 'nexus-search-dialog p-0 max-w-[600px]',
  'search-input-wrap':
    'nexus-search-input-wrap flex items-center gap-[11px] p-[21px] border-b border-solid border-b-border text-muted-foreground [&_input]:border-0 [&_input]:outline-none [&_input]:w-[90%] [&_input]:text-[length:14px]',
  'search-results': 'nexus-search-results max-h-[430px] overflow-auto p-2.5',
  'search-result':
    'nexus-search-result flex items-center gap-3 p-[13px] rounded-[7px] [&:hover]:bg-[#f5f3ff] [&_strong]:text-[length:12px] [&_strong]:font-semibold [&_strong]:block [&_small]:text-[length:10px] [&_small]:text-muted-foreground [&_small]:mt-[5px] [&_small]:block [&_.nexus-badge]:ml-auto',
  'app-footer':
    'nexus-app-footer flex justify-between text-muted-foreground text-[length:9px] mt-[27px] tracking-[0.02em] [@media(max-width:640px)]:text-[length:8px] [&_span]:flex [&_span]:items-center [&_span]:gap-1.5',
  'status-live': 'nexus-status-live w-[5px] h-[5px] bg-[#78ad95] rounded-full',
  'dashboard-eyebrow':
    'nexus-dashboard-eyebrow flex items-center gap-[7px] text-[length:10px] tracking-[0.025em] text-muted-foreground mb-2 [&_.nexus-sun-icon]:text-[#b4a09a]',
  'sun-icon': 'nexus-sun-icon ',
  'dashboard-title':
    'nexus-dashboard-title text-[length:26px] font-semibold tracking-[-1px] [@media(max-width:640px)]:text-[length:25px] [@media(width>640px)_and_(width<=900px)]:text-[length:24px]',
  'metrics-grid':
    'nexus-metrics-grid grid grid-cols-4 gap-4.5 mb-[23px] [@media(max-width:640px)]:grid-cols-2 [@media(max-width:640px)]:gap-[11px] [@media(max-width:640px)]:mb-4.5 [@media(width>640px)_and_(width<=900px)]:gap-3 [@media(width>640px)_and_(width<=900px)]:grid-cols-2 [@media(width>900px)_and_(width<=1000px)]:gap-3 [@media(width>1000px)_and_(width<=1100px)]:gap-3 [@media(min-width:1450px)]:gap-5.5',
  'metric-card':
    'nexus-metric-card pt-5 pr-5 pb-4.5 pl-5 relative [@media(max-width:640px)]:p-4 [@media(max-width:640px)]:py-4 [@media(max-width:640px)]:px-3.5 [@media(width>640px)_and_(width<=900px)]:p-4 [@media(width>900px)_and_(width<=1000px)]:p-4 [@media(width>1000px)_and_(width<=1100px)]:p-4 [@media(min-width:1450px)]:p-6',
  'metric-heading':
    'nexus-metric-heading flex items-center justify-between text-muted-foreground text-[length:11px] [@media(max-width:640px)]:text-[length:10px]',
  'metric-icon':
    'nexus-metric-icon h-7 w-7 grid place-items-center rounded-[7px] bg-[#f2effc] text-[#a18fdb] [@media(max-width:640px)]:h-6 [@media(max-width:640px)]:w-6 [&.nexus-green]:bg-[#edf6f2] [&.nexus-green]:text-[#73a38e] [&.nexus-blue]:bg-[#eff3fc] [&.nexus-blue]:text-[#90a6d1] [&.nexus-orange]:bg-[#fdf3eb] [&.nexus-orange]:text-[#d1a481]',
  green: 'nexus-green ',
  blue: 'nexus-blue ',
  orange: 'nexus-orange ',
  'metric-number':
    'nexus-metric-number text-[length:27px] font-semibold tracking-[-1px] leading-[1] mt-[17px] text-[#30394d] [@media(max-width:640px)]:text-[length:25px] [@media(max-width:640px)]:mt-3.5 [@media(width>640px)_and_(width<=900px)]:text-[length:24px] [@media(width>900px)_and_(width<=1000px)]:text-[length:24px] [@media(width>1000px)_and_(width<=1100px)]:text-[length:24px]',
  'metric-footer':
    'nexus-metric-footer flex gap-1.5 items-center text-[length:9px] text-muted-foreground mt-3 [@media(max-width:640px)]:text-[length:8px] [@media(max-width:640px)]:gap-1 [&_strong]:font-medium [&_strong]:text-[#486956]',
  'metric-mini-chart':
    'nexus-metric-mini-chart absolute right-4.5 bottom-5 opacity-[0.7] [@media(max-width:640px)]:hidden [@media(width>640px)_and_(width<=900px)]:hidden [@media(width>900px)_and_(width<=1000px)]:hidden [@media(width>1000px)_and_(width<=1100px)]:hidden',
  'dashboard-top-grid':
    'nexus-dashboard-top-grid grid grid-cols-[minmax(0,_1.7fr)_minmax(290px,_1fr)] gap-5.5 mb-[23px] [@media(max-width:640px)]:grid-cols-[1fr] [@media(max-width:640px)]:gap-4.5 [@media(max-width:640px)]:mb-4.5 [@media(width>640px)_and_(width<=900px)]:gap-4 [@media(width>640px)_and_(width<=900px)]:grid-cols-[1fr] [@media(width>900px)_and_(width<=1000px)]:grid-cols-[minmax(0,_1.5fr)_minmax(270px,_1fr)] [@media(width>900px)_and_(width<=1000px)]:gap-4 [@media(width>1000px)_and_(width<=1100px)]:grid-cols-[minmax(0,_1.5fr)_minmax(270px,_1fr)] [@media(width>1000px)_and_(width<=1100px)]:gap-4',
  'chart-card': 'nexus-chart-card [&_.nexus-card-header]:pb-0',
  'chart-summary':
    'nexus-chart-summary flex items-baseline gap-[9px] mt-[17px] [&_strong]:text-[length:25px] [&_strong]:tracking-[-1px] [@media(max-width:640px)]:[&_strong]:text-[length:23px] [&_span]:text-[length:10px] [&_span]:text-muted-foreground',
  'chart-area':
    'nexus-chart-area h-[221px] pt-[11px] pr-[15px] pb-0 pl-1 [@media(max-width:640px)]:h-[220px] [@media(max-width:640px)]:pr-[7px] [@media(width>640px)_and_(width<=900px)]:h-[240px] [@media(min-width:1450px)]:h-[255px]',
  'chart-tooltip':
    'nexus-chart-tooltip bg-white py-[11px] px-3.5 border border-solid border-border shadow-[0_5px_20px_#1f294218] rounded-[8px] text-[length:11px] [&_strong]:block [&_strong]:mt-[7px] [&_strong]:text-[#6250ac]',
  'chart-legend':
    'nexus-chart-legend flex items-center gap-[5px] text-[length:10px] text-muted-foreground [@media(max-width:640px)]:text-[length:9px]',
  'legend-dot': 'nexus-legend-dot h-1.5 w-1.5 inline-block rounded-full bg-[#9581d9]',
  'chart-footer':
    'nexus-chart-footer py-3 px-[23px] border-t border-solid border-t-[#f1f2f6] flex justify-between text-[length:9px] text-muted-foreground [@media(max-width:640px)]:py-3 [@media(max-width:640px)]:px-4.5 [@media(max-width:640px)]:text-[length:8px]',
  'pipeline-total':
    'nexus-pipeline-total flex items-baseline gap-[7px] mt-4.5 [&_strong]:text-[length:25px] [&_strong]:tracking-[-1px] [@media(max-width:640px)]:[&_strong]:text-[length:23px] [&_span]:text-[length:10px] [&_span]:text-muted-foreground',
  'pipeline-stacked':
    'nexus-pipeline-stacked flex h-2.5 gap-1 my-5.5 mx-0 rounded-[4px] overflow-hidden [&_div]:min-w-[2px] [&_div]:rounded-[2px]',
  'pipeline-rows':
    'nexus-pipeline-rows flex flex-col gap-4 mb-[3px] [@media(max-width:640px)]:gap-[15px] [@media(width>640px)_and_(width<=900px)]:gap-[15px] [@media(min-width:1450px)]:gap-5',
  'pipeline-row':
    'nexus-pipeline-row flex items-center text-[length:10px] text-muted-foreground gap-2 [&_strong]:ml-auto [&_strong]:font-medium [&_strong]:text-[length:11px] [&_strong]:text-[#4d566b] [&_small]:text-[length:9px] [&_small]:w-[45px] [&_small]:text-right [&_small]:text-muted-foreground',
  'pipeline-dot': 'nexus-pipeline-dot h-[7px] w-[7px] rounded-[2px]',
  'dashboard-bottom-grid':
    'nexus-dashboard-bottom-grid grid grid-cols-[minmax(0,_1.7fr)_minmax(290px,_1fr)] gap-5.5 mb-[23px] [@media(max-width:640px)]:grid-cols-[1fr] [@media(max-width:640px)]:gap-4.5 [@media(max-width:640px)]:mb-4.5 [@media(width>640px)_and_(width<=900px)]:gap-4 [@media(width>640px)_and_(width<=900px)]:grid-cols-[1fr] [@media(width>900px)_and_(width<=1000px)]:grid-cols-[minmax(0,_1.5fr)_minmax(270px,_1fr)] [@media(width>900px)_and_(width<=1000px)]:gap-4 [@media(width>1000px)_and_(width<=1100px)]:grid-cols-[minmax(0,_1.5fr)_minmax(270px,_1fr)] [@media(width>1000px)_and_(width<=1100px)]:gap-4',
  'section-link':
    'nexus-section-link text-[length:10px] font-medium text-[#6b51a5] flex items-center gap-[5px]',
  'recent-leads-table': 'nexus-recent-leads-table [&_.nexus-card-header]:pb-5',
  'person-cell':
    'nexus-person-cell flex items-center gap-2.5 [&_strong]:text-[length:11px] [&_strong]:text-[#4e576b] [&_strong]:font-semibold [&_strong]:block [&_small]:text-[length:9px] [&_small]:text-muted-foreground [&_small]:mt-[5px] [&_small]:block',
  'task-list': 'nexus-task-list pt-[5px] pr-5.5 pb-0 pl-5.5',
  'task-item':
    'nexus-task-item flex items-start gap-[11px] py-4 px-0 border-b border-solid border-b-[#eff0f5] [@media(min-width:1450px)]:py-[19px] [@media(min-width:1450px)]:px-0 [&:last-child]:border-0 [&_h4]:text-[length:11px] [&_h4]:font-medium [&_h4]:text-[#626a7d] [&_h4]:m-0 [&_h4]:leading-[1.5] [&_.nexus-avatar]:ml-auto [&_.nexus-avatar]:self-center',
  'task-check':
    'nexus-task-check appearance-none shrink-0 w-[15px] h-[15px] rounded-[4px] border-[1.3px] border-solid border-[#dcdfea] mt-[1px] cursor-pointer [&:checked]:bg-[#8b79d3] [&:checked]:border-[#8b79d3]',
  'task-meta':
    'nexus-task-meta flex gap-2 items-center mt-[7px] text-[length:9px] text-muted-foreground [&_.nexus-overdue]:text-[#a14049]',
  overdue: 'nexus-overdue ',
  'task-list-footer':
    'nexus-task-list-footer flex justify-between py-[15px] px-5.5 text-[length:9px] border-t border-solid border-t-border text-muted-foreground',
  'activity-card': 'nexus-activity-card [&_.nexus-card-header]:pb-4',
  'activities-strip':
    'nexus-activities-strip grid grid-cols-[repeat(3,_1fr)] pt-0.5 pr-[23px] pb-[21px] pl-[23px] gap-5 [@media(max-width:640px)]:grid-cols-[1fr] [@media(max-width:640px)]:gap-4 [@media(width>640px)_and_(width<=900px)]:grid-cols-[1fr] [@media(width>640px)_and_(width<=900px)]:gap-4',
  'activity-mini':
    'nexus-activity-mini flex gap-[11px] pr-[15px] border-r border-solid border-r-[#eceef3] [@media(max-width:640px)]:border-0 [@media(width>640px)_and_(width<=900px)]:border-0 [&:last-child]:border-0 [&_p]:text-[length:10px] [&_p]:leading-[1.7] [&_p]:text-muted-foreground [&_p]:max-h-[35px] [&_p]:overflow-hidden [&_small]:text-[length:9px] [&_small]:text-muted-foreground [&_small]:block [&_small]:mt-[5px]',
  'activity-mini-icon':
    'nexus-activity-mini-icon h-7.5 w-7.5 rounded-[8px] bg-[#f0effa] text-[#a190d3] grid place-items-center',
  'range-menu': 'nexus-range-menu min-w-[160px]',
  'date-trigger': 'nexus-date-trigger text-[length:11px] font-medium h-[35px]',
  'dashboard-quick-add': 'nexus-dashboard-quick-add h-[35px] text-[length:11px]',
  'dashboard-subtitle':
    'nexus-dashboard-subtitle text-[length:11px] text-muted-foreground mt-[9px] [@media(max-width:640px)]:text-[length:11px]',
  'period-note': 'nexus-period-note text-[length:10px] text-muted-foreground leading-[1.7]',
  'report-grid':
    'nexus-report-grid grid grid-cols-[1.5fr_1fr] gap-5.5 mb-5.5 [@media(max-width:640px)]:grid-cols-[1fr] [@media(width>640px)_and_(width<=900px)]:grid-cols-[1fr]',
  'report-source-row':
    'nexus-report-source-row flex items-center gap-[9px] mb-[17px] text-[length:11px]',
  'source-track': 'nexus-source-track h-[7px] rounded-[4px] bg-[#f1f0f9] flex-1 my-0 mx-2.5',
  'source-fill': 'nexus-source-fill h-[7px] rounded-[4px] bg-[#aa99dd]',
  'source-label': 'nexus-source-label min-w-[70px] text-muted-foreground',
  'report-chart': 'nexus-report-chart h-[270px] pt-[15px] [@media(max-width:640px)]:h-[240px]',
  'auth-page':
    'nexus-auth-page min-h-screen grid grid-cols-[48%_52%] bg-white [@media(max-width:640px)]:block [@media(max-width:640px)]:bg-[#fbfbfd]',
  'auth-story':
    "nexus-auth-story bg-navy relative overflow-hidden py-[45px] px-14.5 flex flex-col text-white [@media(max-width:640px)]:p-7.5 [@media(max-width:640px)]:hidden [@media(width>640px)_and_(width<=900px)]:p-7.5 [@media(width>900px)_and_(width<=1000px)]:p-10 [@media(width>1000px)_and_(width<=1100px)]:p-10 [&_.nexus-brand]:p-0 [&:after]:content-[''] [&:after]:absolute [&:after]:w-[650px] [&:after]:h-[650px] [&:after]:border [&:after]:border-solid [&:after]:border-[#8f80d216] [&:after]:rounded-full [&:after]:left-[-160px] [&:after]:bottom-[-290px] [&:after]:shadow-[0_0_0_90px_#8f80d208,_0_0_0_180px_#8f80d205] [&:after]:pointer-events-none [&_h1]:text-[length:44px] [&_h1]:leading-[1.18] [&_h1]:tracking-[-1.8px] [&_h1]:font-medium [&_h1]:text-[#f1f1fa] [@media(max-width:640px)]:[&_h1]:text-[length:31px] [@media(width>640px)_and_(width<=900px)]:[&_h1]:text-[length:31px] [@media(width>900px)_and_(width<=1000px)]:[&_h1]:text-[length:38px] [@media(width>1000px)_and_(width<=1100px)]:[&_h1]:text-[length:38px] [&_h1_span]:text-[#ad9de8]",
  'auth-story-content':
    'nexus-auth-story-content my-auto mx-0 relative z-[1] max-w-[430px] [&_>_p]:text-[length:13px] [&_>_p]:text-[#8992ab] [&_>_p]:leading-[1.9] [&_>_p]:mt-[23px] [&_>_p]:max-w-[350px]',
  'auth-eyebrow':
    'nexus-auth-eyebrow inline-flex gap-[7px] items-center text-[length:10px] text-[#aaa0d8] bg-[#28283f] border border-solid border-[#3c3652] rounded-[30px] py-1.5 px-2.5 tracking-[0.03em] mb-[27px]',
  'auth-feature':
    'nexus-auth-feature flex items-center gap-3 text-[length:11px] text-[#b1b7c9] mt-5.5 [&_svg]:text-[#a293d7]',
  'auth-quote':
    'nexus-auth-quote mt-12 border-t border-solid border-t-[#2a3248] pt-[25px] [@media(max-width:640px)]:mt-7.5 [@media(width>640px)_and_(width<=900px)]:mt-7.5 [&_p]:text-[length:13px] [&_p]:text-[#b7bbcf] [&_p]:leading-[1.9] [&_p]:italic',
  'auth-quote-user':
    'nexus-auth-quote-user flex items-center gap-2.5 mt-4.5 text-[length:10px] text-[#d1d3e1] [&_small]:block [&_small]:text-[length:9px] [&_small]:text-[#9ba5ba] [&_small]:mt-[5px]',
  'auth-story-footer': 'nexus-auth-story-footer text-[length:10px] text-[#9ba5ba] z-[1]',
  'auth-form-side':
    'nexus-auth-form-side flex items-center justify-center p-[45px] relative [@media(max-width:640px)]:p-7.5 [@media(max-width:640px)]:min-h-screen [@media(max-width:640px)]:py-20 [@media(max-width:640px)]:px-[25px] [@media(width>640px)_and_(width<=900px)]:p-7.5',
  'auth-form-wrap':
    'nexus-auth-form-wrap w-full max-w-[355px] [@media(max-width:640px)]:max-w-[355px] [&_h2]:text-[length:28px] [&_h2]:tracking-[-1px] [@media(max-width:640px)]:[&_h2]:text-[length:27px]',
  'auth-form-icon':
    'nexus-auth-form-icon h-[43px] w-[43px] border border-solid border-[#e8e4f4] grid place-items-center text-[#9481cf] bg-[#f7f4fd] rounded-[12px] mb-[25px]',
  'auth-form-subtitle':
    'nexus-auth-form-subtitle text-[length:12px] text-muted-foreground mt-3 leading-[1.7]',
  'auth-form':
    'nexus-auth-form mt-[31px] flex flex-col gap-5 [&_.nexus-input]:h-11 [&_.nexus-input]:text-[length:12px]',
  'auth-label-row':
    'nexus-auth-label-row flex justify-between items-center [&_a]:text-[length:10px] [&_a]:text-[#6b51a5] [&_a]:mb-[7px]',
  'password-input': 'nexus-password-input relative [&_.nexus-input]:pr-10.5',
  'password-toggle':
    'nexus-password-toggle absolute right-[9px] top-[11px] text-[#adb0bd] bg-transparent border-0 grid place-items-center',
  'auth-submit': 'nexus-auth-submit h-11 mt-1',
  'auth-error':
    'nexus-auth-error text-[#a14049] bg-[#fff3f4] border border-solid border-[#f8dfe1] py-[11px] px-[13px] text-[length:11px] leading-[1.7] rounded-[7px]',
  'demo-panel':
    'nexus-demo-panel mt-7.5 p-4 border border-dashed border-[#e0dceb] rounded-[9px] bg-[#fcfbfe] [&_p]:text-[length:10px] [&_p]:leading-[1.8] [&_p]:text-muted-foreground [&_p]:mt-2',
  'demo-panel-title':
    'nexus-demo-panel-title flex items-center gap-[7px] text-[length:10px] text-[#695780] font-semibold',
  'demo-accounts':
    'nexus-demo-accounts flex gap-[7px] mt-3 [&_button]:border [&_button]:border-solid [&_button]:border-[#e9e5f2] [&_button]:bg-white [&_button]:text-[#695780] [&_button]:text-[length:9px] [&_button]:py-1.5 [&_button]:px-[9px] [&_button]:rounded-[5px] [&_button.nexus-selected]:border-[#b8abdc] [&_button.nexus-selected]:bg-[#f2eefb] [&_button.nexus-selected]:text-[#69518f]',
  selected: 'nexus-selected ',
  'auth-security':
    'nexus-auth-security flex items-center justify-center gap-1.5 text-[length:9px] text-muted-foreground mt-6.5',
  'auth-form-footer':
    'nexus-auth-form-footer absolute bottom-6.5 text-[length:9px] text-muted-foreground [@media(max-width:640px)]:bottom-[19px]',
  'auth-mobile-brand':
    'nexus-auth-mobile-brand hidden [@media(max-width:640px)]:absolute [@media(max-width:640px)]:flex [@media(max-width:640px)]:left-[25px] [@media(max-width:640px)]:top-6 [@media(max-width:640px)]:[&_.nexus-brand]:p-0 [@media(max-width:640px)]:[&_.nexus-brand]:text-[#3b4054] [@media(max-width:640px)]:[&_.nexus-brand-name]:text-[length:22px]',
  'forgot-success':
    'nexus-forgot-success p-[23px] bg-[#f4f9f6] border border-solid border-[#dcebe2] rounded-[9px] my-[25px] mx-0 text-[#486956] text-[length:12px] leading-[1.8]',
  'breadcrumb-home-divider': 'nexus-breadcrumb-home-divider ',
} as const;
