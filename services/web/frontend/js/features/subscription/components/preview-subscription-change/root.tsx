import { useCallback } from 'react'
import { Grid, Row } from 'react-bootstrap'
import moment from 'moment'
import { useTranslation, Trans } from 'react-i18next'
import {
  SubscriptionChangePreview,
  AddOnPurchase,
  PremiumSubscriptionChange,
} from '../../../../../../types/subscription/subscription-change-preview'
import getMeta from '@/utils/meta'
import { formatCurrency } from '@/shared/utils/currency'
import useAsync from '@/shared/hooks/use-async'
import { useLocation } from '@/shared/hooks/use-location'
import { debugConsole } from '@/utils/debugging'
import { postJSON } from '@/infrastructure/fetch-json'
import Notification from '@/shared/components/notification'
import OLCard from '@/features/ui/components/ol/ol-card'
import OLCol from '@/features/ui/components/ol/ol-col'
import OLButton from '@/features/ui/components/ol/ol-button'
import { subscriptionUpdateUrl } from '@/features/subscription/data/subscription-url'
import * as eventTracking from '@/infrastructure/event-tracking'
import sparkleText from '@/shared/svgs/ai-sparkle-text.svg'

function PreviewSubscriptionChange() {
  const preview = getMeta(
    'ol-subscriptionChangePreview'
  ) as SubscriptionChangePreview
  const { t } = useTranslation()
  const payNowTask = useAsync()
  const location = useLocation()

  const handlePayNowClick = useCallback(() => {
    eventTracking.sendMB('assistant-add-on-purchase')
    payNowTask
      .runAsync(payNow(preview))
      .then(() => {
        location.replace('/user/subscription/thank-you')
      })
      .catch(debugConsole.error)
  }, [location, payNowTask, preview])

  const aiAddOnChange =
    preview.change.type === 'add-on-purchase' &&
    preview.change.addOn.code === 'assistant'

  // the driver of the change, which we can display as the immediate charge
  const changeName =
    preview.change.type === 'add-on-purchase'
      ? (preview.change as AddOnPurchase).addOn.name
      : (preview.change as PremiumSubscriptionChange).plan.name

  return (
    <Grid>
      <Row>
        <OLCol md={{ offset: 2, span: 8 }}>
          <OLCard className="p-3">
            {preview.change.type === 'add-on-purchase' ? (
              <h1>
                {t('add_add_on_to_your_plan', {
                  addOnName: preview.change.addOn.name,
                })}
              </h1>
            ) : preview.change.type === 'premium-subscription' ? (
              <h1>
                {t('subscribe_to_plan', { planName: preview.change.plan.name })}
              </h1>
            ) : null}

            {payNowTask.isError && (
              <Notification
                type="error"
                aria-live="polite"
                content={
                  <>
                    {t('generic_something_went_wrong')}. {t('try_again')}.{' '}
                    {t('generic_if_problem_continues_contact_us')}.
                  </>
                }
              />
            )}

            {aiAddOnChange && (
              <div>
                <Trans
                  i18nKey="add_error_assist_to_your_projects"
                  components={{
                    sparkle: (
                      <img
                        alt="sparkle"
                        className="ai-error-assistant-sparkle"
                        src={sparkleText}
                        aria-hidden="true"
                        key="sparkle"
                      />
                    ),
                  }}
                />
              </div>
            )}

            <OLCard className="payment-summary-card mt-5">
              <h3>{t('due_today')}:</h3>
              <Row>
                <OLCol xs={9}>{changeName}</OLCol>
                <OLCol xs={3} className="text-end">
                  <strong>
                    {formatCurrency(
                      preview.immediateCharge.subtotal,
                      preview.currency
                    )}
                  </strong>
                </OLCol>
              </Row>

              {preview.immediateCharge.tax > 0 && (
                <Row className="mt-1">
                  <OLCol xs={9}>
                    {t('vat')} {preview.nextInvoice.tax.rate * 100}%
                  </OLCol>
                  <OLCol xs={3} className="text-end">
                    {formatCurrency(
                      preview.immediateCharge.tax,
                      preview.currency
                    )}
                  </OLCol>
                </Row>
              )}

              <Row className="mt-1">
                <OLCol xs={9}>{t('total_today')}</OLCol>
                <OLCol xs={3} className="text-end">
                  <strong>
                    {formatCurrency(
                      preview.immediateCharge.total,
                      preview.currency
                    )}
                  </strong>
                </OLCol>
              </Row>
            </OLCard>

            <div className="mt-5">
              <Trans
                i18nKey="this_total_reflects_the_amount_due_until"
                values={{ date: moment(preview.nextInvoice.date).format('LL') }}
                components={{ strong: <strong /> }}
                shouldUnescape
                tOptions={{ interpolation: { escapeValue: true } }}
              />{' '}
              <Trans
                i18nKey="we_will_use_your_existing_payment_method"
                values={{ paymentMethod: preview.paymentMethod }}
                components={{ strong: <strong /> }}
                shouldUnescape
                tOptions={{ interpolation: { escapeValue: true } }}
              />
            </div>

            <div className="mt-5">
              <OLButton
                variant="primary"
                size="lg"
                onClick={handlePayNowClick}
                disabled={payNowTask.isLoading || payNowTask.isSuccess}
              >
                {t('pay_now')}
              </OLButton>
            </div>

            <OLCard className="payment-summary-card mt-5">
              <h3>{t('future_payments')}:</h3>
              <Row className="mt-1">
                <OLCol xs={9}>{preview.nextInvoice.plan.name}</OLCol>
                <OLCol xs={3} className="text-end">
                  {formatCurrency(
                    preview.nextInvoice.plan.amount,
                    preview.currency
                  )}
                </OLCol>
              </Row>

              {preview.nextInvoice.addOns.map(addOn => (
                <Row className="mt-1" key={addOn.code}>
                  <OLCol xs={9}>
                    {addOn.name}
                    {addOn.quantity > 1 ? ` ×${addOn.quantity}` : ''}
                  </OLCol>
                  <OLCol xs={3} className="text-end">
                    {formatCurrency(addOn.amount, preview.currency)}
                  </OLCol>
                </Row>
              ))}

              {preview.nextInvoice.tax.rate > 0 && (
                <Row className="mt-1">
                  <OLCol xs={9}>
                    {t('vat')} {preview.nextInvoice.tax.rate * 100}%
                  </OLCol>
                  <OLCol xs={3} className="text-end">
                    {formatCurrency(
                      preview.nextInvoice.tax.amount,
                      preview.currency
                    )}
                  </OLCol>
                </Row>
              )}

              <Row className="mt-1">
                <OLCol xs={9}>
                  {preview.nextPlan.annual
                    ? t('total_per_year')
                    : t('total_per_month')}
                </OLCol>
                <OLCol xs={3} className="text-end">
                  {formatCurrency(preview.nextInvoice.total, preview.currency)}
                </OLCol>
              </Row>
            </OLCard>

            <div className="mt-5">
              <Trans
                i18nKey="the_next_payment_will_be_collected_on"
                values={{ date: moment(preview.nextInvoice.date).format('LL') }}
                components={{ strong: <strong /> }}
                shouldUnescape
                tOptions={{ interpolation: { escapeValue: true } }}
              />
            </div>
          </OLCard>
        </OLCol>
      </Row>
    </Grid>
  )
}

async function payNow(preview: SubscriptionChangePreview) {
  if (preview.change.type === 'add-on-purchase') {
    await postJSON(`/user/subscription/addon/${preview.change.addOn.code}/add`)
  } else if (preview.change.type === 'premium-subscription') {
    await postJSON(subscriptionUpdateUrl, {
      body: { plan_code: preview.change.plan.code },
    })
  } else {
    throw new Error(
      `Unknown subscription change preview type: ${preview.change}`
    )
  }
}

export default PreviewSubscriptionChange
