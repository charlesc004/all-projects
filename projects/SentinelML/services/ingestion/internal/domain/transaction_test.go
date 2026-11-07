package domain

import (
	"math"
	"testing"
)

func TestValidation(t *testing.T) {
	valid := Transaction{AccountToken: "tok_demo", Merchant: "Northstar Market", Amount: 125, Currency: "USD", Country: "US", DeviceTrust: 0.8}
	if err := valid.Validate(); err != nil {
		t.Fatal(err)
	}
	for _, amount := range []float64{-1, 0, math.NaN(), math.Inf(1), 10000001, 12.345} {
		bad := valid
		bad.Amount = amount
		if bad.Validate() == nil {
			t.Fatalf("accepted invalid amount %v", amount)
		}
	}
	bad := valid
	bad.AccountToken = "1234567890123456"
	if bad.Validate() == nil {
		t.Fatal("accepted an untokenized numeric reference")
	}
}
