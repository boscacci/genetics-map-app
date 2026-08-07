import React, { useRef, useState } from 'react';
import { MapPoint } from './types';
import {
  cleanDisplayValue,
  displayFullAddress,
  displayInstitution,
  displayName,
  formatInterpreterServices,
  formatLanguages,
  getWebsiteDetails,
  hasPrivateContactDetails,
  isFlagTrue,
  shouldShowInstitution,
} from './providerDisplay';

const ADMIN_EMAIL = 'globalgeneticsdirectory@gmail.com';

type CopyField = 'email' | 'phone' | 'website' | 'address';
type CopyStatus = 'idle' | 'copied' | 'select';

interface ContactDetailsModalProps {
  specialist: MapPoint;
  onClose: () => void;
}

interface CopyableContactItemProps {
  field: CopyField;
  icon: string;
  value: string;
  status: CopyStatus;
  onCopy: (field: CopyField, value: string) => void;
  setValueRef: (field: CopyField, node: HTMLSpanElement | null) => void;
  children: React.ReactNode;
}

const CopyableContactItem: React.FC<CopyableContactItemProps> = ({
  field,
  icon,
  value,
  status,
  onCopy,
  setValueRef,
  children,
}) => {
  const buttonText = status === 'copied'
    ? 'Copied'
    : status === 'select'
      ? 'Select text'
      : 'Copy';

  return (
    <div className="contact-item contact-item-copyable">
      <span className="contact-icon" aria-hidden="true">{icon}</span>
      <span
        className="contact-copy-value"
        ref={(node) => setValueRef(field, node)}
      >
        {children}
      </span>
      <button
        type="button"
        className={`copy-contact-btn copy-contact-btn-${status}`}
        data-copy-field={field}
        aria-label={`Copy ${field}`}
        aria-live="polite"
        onClick={() => onCopy(field, value)}
      >
        {buttonText}
      </button>
    </div>
  );
};

const ContactDetailsModal: React.FC<ContactDetailsModalProps> = ({ specialist, onClose }) => {
  const [copyStatuses, setCopyStatuses] = useState<Partial<Record<CopyField, CopyStatus>>>({});
  const [privateContactGuidanceVisible, setPrivateContactGuidanceVisible] = useState(false);
  const copyValueRefs = useRef<Partial<Record<CopyField, HTMLSpanElement | null>>>({});

  const safeName = isFlagTrue(specialist.hide_name)
    ? 'Anonymous Contributor'
    : displayName(specialist.name_first, specialist.name_last);
  const jobTitle = cleanDisplayValue(specialist.job_title);
  const specialtyText = cleanDisplayValue(specialist.specialties);
  const languageText = formatLanguages(specialist.language_spoken);
  const interpreterServicesText = formatInterpreterServices(specialist.interpreter_services);
  const institutionText = cleanDisplayValue(specialist.work_institution);
  const email = cleanDisplayValue(specialist.email);
  const phone = cleanDisplayValue(specialist.phone_work);
  const emailIsPrivate = isFlagTrue(specialist.hide_email);
  const phoneIsPrivate = isFlagTrue(specialist.hide_phone);
  const website = getWebsiteDetails(specialist.work_website);
  const address = displayFullAddress(specialist);
  const addressIsPrivate = isFlagTrue(specialist.hide_institution_address);
  const showInstitution = shouldShowInstitution(specialist);
  const showPrivateContactNote = hasPrivateContactDetails(specialist);

  const setValueRef = (field: CopyField, node: HTMLSpanElement | null) => {
    copyValueRefs.current[field] = node;
  };

  const selectCopyValue = (field: CopyField) => {
    const valueNode = copyValueRefs.current[field];
    if (!valueNode) return;

    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.selectNodeContents(valueNode);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const handleCopy = async (field: CopyField, value: string) => {
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(value);
      setCopyStatuses({ [field]: 'copied' });
    } catch {
      selectCopyValue(field);
      setCopyStatuses({ [field]: 'select' });
    }
  };

  return (
    <div className="contact-modal-overlay" onClick={onClose}>
      <div
        className="contact-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-name"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="contact-modal-header">
          <div className="contact-modal-heading">
            <h3 id="contact-modal-name">{safeName}</h3>
            {jobTitle && (
              <div className="contact-modal-title">{jobTitle}</div>
            )}
          </div>
          <button
            type="button"
            className="modal-close-btn"
            aria-label="Close contact details"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="contact-modal-content">
          {showInstitution && institutionText && (
            <div className="contact-item">
              <span className="contact-icon" aria-hidden="true">🏢</span>
              <span className="contact-text">{displayInstitution(institutionText)}</span>
            </div>
          )}

          {specialtyText && (
            <div className="contact-item">
              <span className="contact-icon" aria-hidden="true">🧬</span>
              <span className="contact-text">{specialtyText}</span>
            </div>
          )}

          {languageText && (
            <div className="contact-item contact-languages">
              <span className="contact-icon" aria-hidden="true">🗣️</span>
              <span className="contact-text">Languages: {languageText}</span>
            </div>
          )}

          <div className="contact-item contact-interpreter-services">
            <span className="contact-icon" aria-hidden="true">🔄</span>
            <span className="contact-text">Interpreter services: {interpreterServicesText}</span>
          </div>

          {!emailIsPrivate && email && (
            <CopyableContactItem
              field="email"
              icon="📧"
              value={email}
              status={copyStatuses.email || 'idle'}
              onCopy={handleCopy}
              setValueRef={setValueRef}
            >
              <a href={`mailto:${email}`} className="contact-link">{email}</a>
            </CopyableContactItem>
          )}

          {!phoneIsPrivate && phone && (
            <CopyableContactItem
              field="phone"
              icon="📞"
              value={phone}
              status={copyStatuses.phone || 'idle'}
              onCopy={handleCopy}
              setValueRef={setValueRef}
            >
              <a href={`tel:${phone}`} className="contact-link">{phone}</a>
            </CopyableContactItem>
          )}

          {website.displayValue && (
            <CopyableContactItem
              field="website"
              icon="🌐"
              value={website.displayValue}
              status={copyStatuses.website || 'idle'}
              onCopy={handleCopy}
              setValueRef={setValueRef}
            >
              {website.href ? (
                <a
                  href={website.href}
                  className="contact-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {website.displayValue}
                </a>
              ) : (
                <span className="contact-text">{website.displayValue}</span>
              )}
            </CopyableContactItem>
          )}

          {!addressIsPrivate && address.copyValue && (
            <CopyableContactItem
              field="address"
              icon="📍"
              value={address.copyValue}
              status={copyStatuses.address || 'idle'}
              onCopy={handleCopy}
              setValueRef={setValueRef}
            >
              <span className="contact-text">
                {address.detailLine && (
                  <span className="contact-address-line contact-address-detail">
                    {address.detailLine}
                  </span>
                )}
                {address.structuredLine && (
                  <span className="contact-address-line contact-address-structured">
                    {address.structuredLine}
                  </span>
                )}
              </span>
            </CopyableContactItem>
          )}

          {showPrivateContactNote && (
            <div className="private-contact-details">
              <button
                type="button"
                className="private-contact-toggle"
                data-private-contact-toggle
                aria-expanded={privateContactGuidanceVisible}
                aria-controls="private-contact-guidance"
                onClick={() => setPrivateContactGuidanceVisible((visible) => !visible)}
              >
                <span aria-hidden="true">👁</span>
                <span>Private details</span>
              </button>
              <div
                id="private-contact-guidance"
                className="private-contact-guidance"
                role="status"
                hidden={!privateContactGuidanceVisible}
              >
                Please email <a href={`mailto:${ADMIN_EMAIL}`}>{ADMIN_EMAIL}</a> for further information.
              </div>
            </div>
          )}

          <div className="verification-disclaimer">
            Disclaimer: We attempt to verify the credentials of every directory participant.
            {' '}If you notice any discrepancy, please email{' '}
            <a href={`mailto:${ADMIN_EMAIL}`}>{ADMIN_EMAIL}</a>.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactDetailsModal;
