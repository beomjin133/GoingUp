from exchanges.upbit import UpbitAdapter
from exchanges.kis import KISAdapter

# 새 거래소 추가 시 여기에만 등록하면 됩니다.
# api_keys.service 값과 키가 일치해야 합니다.
ADAPTERS = {
    'upbit': UpbitAdapter,
    'kis':   KISAdapter,
}
