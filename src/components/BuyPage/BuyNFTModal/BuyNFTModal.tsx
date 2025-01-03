import React, { useCallback } from 'react'
import { Link } from 'react-router-dom'
import classNames from 'classnames'
import compact from 'lodash/compact'
import { Contract, NFTCategory } from '@dcl/schemas'
import { ChainButton, withAuthorizedAction } from 'decentraland-dapps/dist/containers'
import { AuthorizedAction } from 'decentraland-dapps/dist/containers/withAuthorizedAction/AuthorizationModal'
import { getAnalytics } from 'decentraland-dapps/dist/modules/analytics/utils'
import { AuthorizationType } from 'decentraland-dapps/dist/modules/authorization/types'
import { T, t } from 'decentraland-dapps/dist/modules/translation/utils'
import { ContractName, getContract as getDCLContract } from 'decentraland-transactions'
import { Header, Button, Mana, Icon } from 'decentraland-ui'
import { AssetType } from '../../../modules/asset/types'
import { isWearableOrEmote } from '../../../modules/asset/utils'
import { useFingerprint } from '../../../modules/nft/hooks'
import { getBuyItemStatus, getError } from '../../../modules/order/selectors'
import { locations } from '../../../modules/routing/locations'
import { getContractNames } from '../../../modules/vendor'
import { Contract as DCLContract } from '../../../modules/vendor/services'
import * as events from '../../../utils/events'
import { AssetAction } from '../../AssetAction'
import { AssetProviderPage } from '../../AssetProviderPage'
import ErrorBanner from '../../ErrorBanner'
import { Network as NetworkSubtitle } from '../../Network'
import PriceSubtitle from '../../Price'
import { CardPaymentsExplanation } from '../CardPaymentsExplanation'
import { Name } from '../Name'
import { NotEnoughMana } from '../NotEnoughMana'
import { PartiallySupportedNetworkCard } from '../PartiallySupportedNetworkCard'
import { Price } from '../Price'
import { PriceHasChanged } from '../PriceHasChanged'
import { PriceTooLow } from '../PriceTooLow'
import { Props } from './BuyNFTModal.types'

const BuyNFTModal = (props: Props) => {
  const {
    nft,
    order,
    isLoading,
    isOwner,
    hasInsufficientMANA,
    hasLowPrice,
    isBuyWithCardPage,
    isLoadingAuthorization,
    isOffchainPublicNFTOrdersEnabled,
    getContract,
    onExecuteOrder,
    onExecuteOrderWithCard,
    onAuthorizedAction,
    onClearOrderErrors
  } = props

  const [fingerprint, isFingerprintLoading, contractFingerprint] = useFingerprint(nft)
  const analytics = getAnalytics()

  const handleExecuteOrder = useCallback(
    (alreadyAuthorized: boolean = true) => {
      if (isBuyWithCardPage) {
        analytics.track(events.CLICK_BUY_NFT_WITH_CARD)
        return onExecuteOrderWithCard(nft, order || undefined)
      }

      !!order && onExecuteOrder(order, nft, fingerprint, !alreadyAuthorized)
    },
    [isBuyWithCardPage, onExecuteOrderWithCard, onExecuteOrder, order, nft, fingerprint, analytics]
  )

  const handleCancel = useCallback(() => {
    if (isBuyWithCardPage) analytics.track(events.CANCEL_BUY_NFT_WITH_CARD)
  }, [analytics, isBuyWithCardPage])

  const contractNames = getContractNames()

  const mana = getContract({
    name: contractNames.MANA,
    network: nft.network
  }) as DCLContract

  const marketplace = getContract({
    address: order?.marketplaceAddress,
    network: nft.network
  }) as DCLContract

  const offchainMarketplace =
    isOffchainPublicNFTOrdersEnabled && order?.tradeId && getDCLContract(ContractName.OffChainMarketplace, nft.chainId)

  const handleSubmit = useCallback(() => {
    if (isBuyWithCardPage) {
      handleExecuteOrder()
      return
    }
    if (order) {
      onClearOrderErrors()
      onAuthorizedAction({
        targetContractName: ContractName.MANAToken,
        authorizationType: AuthorizationType.ALLOWANCE,
        authorizedAddress: offchainMarketplace ? offchainMarketplace.address : order.marketplaceAddress,
        targetContract: mana as Contract,
        authorizedContractLabel: offchainMarketplace ? offchainMarketplace.name : marketplace.label || marketplace.name,
        requiredAllowanceInWei: order.price,
        onAuthorized: handleExecuteOrder
      })
    }
  }, [handleExecuteOrder, onAuthorizedAction, onClearOrderErrors, isBuyWithCardPage, order, mana, marketplace])

  const isDisabled =
    !order ||
    isOwner ||
    (hasInsufficientMANA && !isBuyWithCardPage) ||
    (!fingerprint && nft.category === NFTCategory.ESTATE) ||
    isFingerprintLoading ||
    contractFingerprint !== fingerprint

  const name = <Name asset={nft} />

  const translationPageDescriptorId = compact([
    'buy',
    isWearableOrEmote(nft) ? (isBuyWithCardPage ? 'with_card' : 'with_mana') : null,
    'page'
  ]).join('_')

  let subtitle = null
  if (!order) {
    subtitle = <T id={`${translationPageDescriptorId}.not_for_sale`} values={{ name }} />
  } else if (isOwner) {
    subtitle = <T id={`${translationPageDescriptorId}.is_owner`} values={{ name }} />
  } else if (hasInsufficientMANA && !isBuyWithCardPage) {
    const description = (
      <T
        id={`${translationPageDescriptorId}.not_enough_mana`}
        values={{
          name,
          amount: <Price network={nft.network} price={order.price} />
        }}
      />
    )
    subtitle = isWearableOrEmote(nft) ? <NotEnoughMana asset={nft} description={description} /> : description
  } else {
    subtitle = isWearableOrEmote(nft) ? (
      <div className="subtitle-wrapper">
        <PriceSubtitle asset={nft} />
        <NetworkSubtitle asset={nft} />
      </div>
    ) : (
      <T
        id={`${translationPageDescriptorId}.subtitle`}
        values={{
          name,
          amount: <Price network={nft.network} price={order.price} />
        }}
      />
    )
  }

  return (
    <AssetAction asset={nft}>
      <Header size="large">
        {t(`${translationPageDescriptorId}.title`, {
          name,
          category: t(`global.${nft.category}`)
        })}
      </Header>
      <div className={isDisabled ? 'error' : ''}>{subtitle}</div>
      <AssetProviderPage type={AssetType.NFT}>
        {(asset, newOrder) => {
          return newOrder && order && newOrder.price !== order.price ? <PriceHasChanged asset={asset} newPrice={newOrder.price} /> : null
        }}
      </AssetProviderPage>
      {hasLowPrice && !isBuyWithCardPage ? <PriceTooLow chainId={nft.chainId} network={nft.network} /> : null}
      <PartiallySupportedNetworkCard asset={nft} />
      {!isFingerprintLoading && contractFingerprint !== fingerprint ? (
        <ErrorBanner info={t('atlas_updated_warning.fingerprint_missmatch')} />
      ) : null}
      <div className={classNames('buttons', isWearableOrEmote(nft) && 'with-mana')}>
        <Button as={Link} to={locations.nft(nft.contractAddress, nft.tokenId)} onClick={handleCancel}>
          {!isBuyWithCardPage && (hasLowPrice || hasInsufficientMANA) ? t('global.go_back') : t('global.cancel')}
        </Button>
        {(!hasInsufficientMANA && !hasLowPrice) || isBuyWithCardPage ? (
          <ChainButton
            primary
            disabled={isDisabled || isLoading || isLoadingAuthorization}
            onClick={handleSubmit}
            loading={isLoading || isLoadingAuthorization}
            chainId={nft.chainId}
          >
            {isWearableOrEmote(nft) ? (
              isBuyWithCardPage ? (
                <Icon name="credit card outline" />
              ) : (
                <Mana showTooltip inline size="small" network={nft.network} />
              )
            ) : null}
            {t(`${translationPageDescriptorId}.buy`)}
          </ChainButton>
        ) : null}
      </div>
      {isWearableOrEmote(nft) && isBuyWithCardPage ? (
        <CardPaymentsExplanation translationPageDescriptorId={translationPageDescriptorId} />
      ) : null}
    </AssetAction>
  )
}

export default React.memo(
  withAuthorizedAction(
    BuyNFTModal,
    AuthorizedAction.BUY,
    {
      action: 'buy_with_mana_page.authorization.action',
      title_action: 'buy_with_mana_page.authorization.title_action'
    },
    getBuyItemStatus,
    getError
  )
)
