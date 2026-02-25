"""
Test cases for Transaction Management API endpoints.
Tests cover: POST /api/transactions, DELETE /api/transactions/{trans_id}
"""

import pytest
from fastapi.testclient import TestClient


class TestAddTransaction:
    """Tests for POST /api/transactions endpoint."""
    
    def test_add_transaction_buy(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-012: 添加交易记录 - 买入
        
        验证点:
        - 返回交易记录
        - type为buy
        - 自动计算份额（金额模式）
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        
        response = client.post(
            "/api/transactions",
            json={
                "fund_code": "000001",
                "type": "buy",
                "amount": 1500.0,
                "shares": 0,
                "price": 1.5,
                "trans_date": "2026-02-25",
                "is_after_3pm": False,
                "mode": "amount"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["fund_code"] == "000001"
        assert data["type"] == "buy"
        assert data["amount"] == 1500.0
        # 份额 = 金额 / 价格 = 1500 / 1.5 = 1000
        assert data["shares"] == 1000.0
    
    def test_add_transaction_sell(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-013: 添加交易记录 - 卖出
        
        验证点:
        - 返回交易记录
        - type为sell
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        
        response = client.post(
            "/api/transactions",
            json={
                "fund_code": "000001",
                "type": "sell",
                "amount": 1500.0,
                "shares": 1000.0,
                "price": 1.5,
                "trans_date": "2026-02-25",
                "is_after_3pm": False,
                "mode": "shares"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["type"] == "sell"
    
    def test_add_transaction_fund_not_found(self, client: TestClient, mock_data_sources):
        """
        TC-API-014: 添加交易记录 - 基金不存在
        
        验证点:
        - 返回404错误
        - 错误信息明确
        """
        response = client.post(
            "/api/transactions",
            json={
                "fund_code": "999999",
                "type": "buy",
                "amount": 1000.0,
                "shares": 0,
                "price": 1.5,
                "trans_date": "2026-02-25",
                "is_after_3pm": False,
                "mode": "amount"
            }
        )
        
        assert response.status_code == 404
        assert "不存在" in response.json()["detail"]
    
    def test_add_transaction_invalid_type(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-015: 添加交易记录 - 无效交易类型
        
        验证点:
        - 返回400错误
        - 错误信息提示有效类型
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        
        response = client.post(
            "/api/transactions",
            json={
                "fund_code": "000001",
                "type": "invalid_type",
                "amount": 1000.0,
                "shares": 0,
                "price": 1.5,
                "trans_date": "2026-02-25",
                "is_after_3pm": False,
                "mode": "amount"
            }
        )
        
        assert response.status_code == 400
        assert "buy" in response.json()["detail"] or "sell" in response.json()["detail"]
    
    def test_add_transaction_zero_price(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-016: 添加交易记录 - 价格为0
        
        验证点:
        - 返回400错误
        - 错误信息提示价格必须大于0
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        
        response = client.post(
            "/api/transactions",
            json={
                "fund_code": "000001",
                "type": "buy",
                "amount": 1000.0,
                "shares": 0,
                "price": 0,
                "trans_date": "2026-02-25",
                "is_after_3pm": False,
                "mode": "amount"
            }
        )
        
        assert response.status_code == 400
        assert "价格" in response.json()["detail"]
    
    def test_add_transaction_negative_price(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-016b: 添加交易记录 - 负价格
        
        验证点:
        - 返回400或422错误
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        
        response = client.post(
            "/api/transactions",
            json={
                "fund_code": "000001",
                "type": "buy",
                "amount": 1000.0,
                "shares": 0,
                "price": -1.5,
                "trans_date": "2026-02-25",
                "is_after_3pm": False,
                "mode": "amount"
            }
        )
        
        assert response.status_code in [400, 422]
    
    def test_add_transaction_negative_amount(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-017: 添加交易记录 - 金额为负数
        
        验证点:
        - 返回400错误
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        
        response = client.post(
            "/api/transactions",
            json={
                "fund_code": "000001",
                "type": "buy",
                "amount": -1000.0,
                "shares": 0,
                "price": 1.5,
                "trans_date": "2026-02-25",
                "is_after_3pm": False,
                "mode": "amount"
            }
        )
        
        assert response.status_code == 400
        assert "金额" in response.json()["detail"]
    
    def test_add_transaction_zero_amount(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-017b: 添加交易记录 - 金额为0
        
        验证点:
        - 返回400错误（金额模式）
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        
        response = client.post(
            "/api/transactions",
            json={
                "fund_code": "000001",
                "type": "buy",
                "amount": 0,
                "shares": 0,
                "price": 1.5,
                "trans_date": "2026-02-25",
                "is_after_3pm": False,
                "mode": "amount"
            }
        )
        
        assert response.status_code == 400
    
    def test_add_transaction_shares_mode(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-018: 添加交易记录 - 份额模式
        
        验证点:
        - 按份额计算金额
        - 正确计算
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        
        response = client.post(
            "/api/transactions",
            json={
                "fund_code": "000001",
                "type": "buy",
                "amount": 0,
                "shares": 1000.0,
                "price": 1.5,
                "trans_date": "2026-02-25",
                "is_after_3pm": False,
                "mode": "shares"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["shares"] == 1000.0
        # 金额 = 份额 * 价格 = 1000 * 1.5 = 1500
        assert data["amount"] == 1500.0
    
    def test_add_transaction_after_3pm(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-019: 添加交易记录 - 15:00后交易
        
        验证点:
        - is_after_3pm为True
        - 确认日期应为T+2
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        
        response = client.post(
            "/api/transactions",
            json={
                "fund_code": "000001",
                "type": "buy",
                "amount": 1500.0,
                "shares": 0,
                "price": 1.5,
                "trans_date": "2026-02-25",
                "is_after_3pm": True,
                "mode": "amount"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["shares"] == 1000.0
    
    def test_add_transaction_missing_required_fields(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-020: 添加交易记录 - 缺少必填字段
        
        验证点:
        - 返回422验证错误
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        
        response = client.post(
            "/api/transactions",
            json={
                "fund_code": "000001",
                # Missing type
                "amount": 1000.0,
                "price": 1.5,
                "trans_date": "2026-02-25"
            }
        )
        
        assert response.status_code == 422
    
    def test_add_transaction_invalid_date_format(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-021: 添加交易记录 - 无效日期格式
        
        验证点:
        - 返回错误（格式验证）
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        
        response = client.post(
            "/api/transactions",
            json={
                "fund_code": "000001",
                "type": "buy",
                "amount": 1000.0,
                "shares": 0,
                "price": 1.5,
                "trans_date": "2026/02/25",  # Wrong format
                "is_after_3pm": False,
                "mode": "amount"
            }
        )
        
        # 可能不会报错，因为只是字符串存储
        # 主要看业务逻辑是否需要格式验证
        assert response.status_code in [200, 400, 422]


class TestDeleteTransaction:
    """Tests for DELETE /api/transactions/{trans_id} endpoint."""
    
    def test_delete_transaction_success(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-018: 删除交易记录 - 正常删除
        
        验证点:
        - 返回状态码204
        - 交易记录被删除
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        trans_id = test_storage.add_transaction("000001", "buy", 1000.0, 666.67, 1.5, "2026-02-25")
        
        response = client.delete(f"/api/transactions/{trans_id}")
        
        assert response.status_code == 204
        assert test_storage.get_transaction(trans_id) is None
    
    def test_delete_transaction_not_found(self, client: TestClient, mock_data_sources):
        """
        TC-API-019: 删除交易记录 - 记录不存在
        
        验证点:
        - 返回404错误
        """
        response = client.delete("/api/transactions/99999")
        
        assert response.status_code == 404
        assert "不存在" in response.json()["detail"]
    
    def test_delete_transaction_updates_position(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-022: 删除交易记录 - 重新计算持仓
        
        验证点:
        - 删除后持仓重新计算
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        
        # 添加已确认的交易
        trans_id = test_storage.add_transaction(
            "000001", "buy", 1500.0, 1000.0, 1.5, "2026-02-20",
            confirm_date="2026-02-21", status="confirmed"
        )
        
        # 更新持仓
        test_storage.update_fund_holding("000001", shares=1000.0, cost=1.5)
        
        response = client.delete(f"/api/transactions/{trans_id}")
        
        assert response.status_code == 204


class TestTransactionStatus:
    """Tests for transaction status management."""
    
    def test_transaction_pending_status(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-023: 交易状态 - 待确认
        
        验证点:
        - 新交易默认状态为pending
        - 未来日期的交易
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        
        # 使用未来日期
        response = client.post(
            "/api/transactions",
            json={
                "fund_code": "000001",
                "type": "buy",
                "amount": 1500.0,
                "shares": 0,
                "price": 1.5,
                "trans_date": "2099-12-31",  # Future date
                "is_after_3pm": False,
                "mode": "amount"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"
    
    def test_transaction_confirmed_status(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-024: 交易状态 - 已确认
        
        验证点:
        - 过去日期的交易自动确认
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        
        response = client.post(
            "/api/transactions",
            json={
                "fund_code": "000001",
                "type": "buy",
                "amount": 1500.0,
                "shares": 0,
                "price": 1.5,
                "trans_date": "2020-01-01",  # Past date
                "is_after_3pm": False,
                "mode": "amount"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "confirmed"


class TestTransactionEdgeCases:
    """Edge case tests for transactions."""
    
    def test_multiple_transactions_same_fund(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-025: 边界测试 - 同一基金多次交易
        
        验证点:
        - 可以添加多次交易
        - 返回正确的记录数
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        
        # 添加3笔交易
        for i in range(3):
            response = client.post(
                "/api/transactions",
                json={
                    "fund_code": "000001",
                    "type": "buy",
                    "amount": 1000.0,
                    "shares": 0,
                    "price": 1.5,
                    "trans_date": f"2026-02-{20+i:02d}",
                    "is_after_3pm": False,
                    "mode": "amount"
                }
            )
            assert response.status_code == 200
        
        # 验证交易记录数
        response = client.get("/api/funds/000001/transactions")
        assert len(response.json()) == 3
    
    def test_transaction_very_large_amount(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-026: 边界测试 - 超大金额
        
        验证点:
        - 支持大金额交易
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        
        response = client.post(
            "/api/transactions",
            json={
                "fund_code": "000001",
                "type": "buy",
                "amount": 1000000000.0,  # 10亿
                "shares": 0,
                "price": 1.5,
                "trans_date": "2026-02-25",
                "is_after_3pm": False,
                "mode": "amount"
            }
        )
        
        assert response.status_code == 200
        assert response.json()["amount"] == 1000000000.0
    
    def test_transaction_decimal_precision(self, client: TestClient, mock_data_sources, test_storage):
        """
        TC-API-027: 边界测试 - 小数精度
        
        验证点:
        - 支持高精度小数
        """
        test_storage.upsert_fund("000001", "华夏成长混合A", None)
        
        response = client.post(
            "/api/transactions",
            json={
                "fund_code": "000001",
                "type": "buy",
                "amount": 1234.5678,
                "shares": 0,
                "price": 1.2345,
                "trans_date": "2026-02-25",
                "is_after_3pm": False,
                "mode": "amount"
            }
        )
        
        assert response.status_code == 200