from typing import TYPE_CHECKING

from rotkehlchen.chain.l2_with_l1_fees.etherscan import L2WithL1FeesEtherscan
from rotkehlchen.types import ExternalService, SupportedBlockchain

if TYPE_CHECKING:
    from rotkehlchen.db.dbhandler import DBHandler
    from rotkehlchen.user_messages import MessagesAggregator


class ScrollEtherscan(L2WithL1FeesEtherscan):

    def __init__(
            self,
            database: 'DBHandler',
            msg_aggregator: 'MessagesAggregator',
    ) -> None:
        super().__init__(
            database=database,
            msg_aggregator=msg_aggregator,
            chain=SupportedBlockchain.SCROLL,
            base_url='scrollscan.com',
            service=ExternalService.SCROLL_ETHERSCAN,
        )
