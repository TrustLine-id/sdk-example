import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { trustline } from '@trustline.id/websdk'
import './App.css'
import PaymentFirewallABI from './abis/PaymentFirewall.json'

// Default contract address from environment (can be overridden via input field)
const CONTRACT_ADDRESS = (import.meta as any).env?.VITE_CONTRACT_ADDRESS || ''

interface Window {
  ethereum?: any
}

declare const window: Window

function App() {
  const [account, setAccount] = useState<string | null>(null)
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null)
  const [contract, setContract] = useState<ethers.Contract | null>(null)
  const [contractAddress, setContractAddress] = useState<string>(CONTRACT_ADDRESS)
  const [network, setNetwork] = useState<{ name: string; chainId: bigint } | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isValidatingContract, setIsValidatingContract] = useState(false)
  const [isValidatingTransaction, setIsValidatingTransaction] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showOnboardingMessage, setShowOnboardingMessage] = useState(false)

  // Trustline Client ID - replace with your actual client ID
  const TRUSTLINE_CLIENT_ID = 'YOUR_TRUSTLINE_CLIENT_ID'

  // Payment form state - Ethers
  const [ethRecipient, setEthRecipient] = useState('')
  const [ethAmount, setEthAmount] = useState('')
  
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Initialize Trustline WebSDK
    try {
      trustline.init({ clientId: TRUSTLINE_CLIENT_ID })
      console.log('Trustline SDK initialized')
    } catch (err) {
      console.error('Failed to initialize Trustline SDK:', err)
    }
  }, [])

  const validatePaymentFirewallContract = async (address: string, provider: ethers.BrowserProvider): Promise<boolean> => {
    try {
      // Get the contract code to verify it's a contract
      const code = await provider.getCode(address)
      if (code === '0x') {
        return false // Not a contract
      }

      // Verify the contract has the PaymentFirewall interface by checking for the payEthers function
      const iface = new ethers.Interface(PaymentFirewallABI.abi)
      const payEthersFragment = iface.getFunction('payEthers')
      
      if (!payEthersFragment) {
        return false
      }

      // Try to create a contract instance to verify the ABI matches
      // This will throw if the contract doesn't match the expected interface
      new ethers.Contract(
        address,
        PaymentFirewallABI.abi,
        provider
      )

      return true
    } catch (err) {
      console.error('Contract validation error:', err)
      return false
    }
  }

  const handleContractAddressChange = async (address: string) => {
    setContractAddress(address)
    setError(null)
    setSuccess(null)
    
    if (!signer) {
      return
    }

    if (!address || address.trim() === '') {
      setContract(null)
      return
    }

    if (!ethers.isAddress(address)) {
      setError('Invalid contract address format')
      setContract(null)
      return
    }

    setIsValidatingContract(true)

    try {
      // Get provider from signer
      const provider = signer.provider as ethers.BrowserProvider
      
      // Validate it's a PaymentFirewall contract
      const isValid = await validatePaymentFirewallContract(address, provider)
      
      if (!isValid) {
        setError('The address does not appear to be a PaymentFirewall contract. Please verify the address.')
        setContract(null)
        setIsValidatingContract(false)
        return
      }

      // Create contract instance
      const contractInstance = new ethers.Contract(
        address,
        PaymentFirewallABI.abi,
        signer
      )
      setContract(contractInstance)
      setSuccess('PaymentFirewall contract validated and initialized successfully!')
    } catch (err: any) {
      setError('Failed to validate contract: ' + (err.message || 'Unknown error'))
      setContract(null)
    } finally {
      setIsValidatingContract(false)
    }
  }

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask extension')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      // Create provider and signer
      const browserProvider = new ethers.BrowserProvider(window.ethereum)
      const networkInfo = await browserProvider.getNetwork()
      console.log('Connected to network:', networkInfo.name, networkInfo.chainId)

      const browserSigner = await browserProvider.getSigner()
      const address = await browserSigner.getAddress()

      setSigner(browserSigner)
      setAccount(address)
      setNetwork(networkInfo)

      // Initialize contract if address is already set
      if (contractAddress && contractAddress.trim() !== '' && ethers.isAddress(contractAddress)) {
        await handleContractAddressChange(contractAddress)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet')
      console.error('Connection error:', err)
    } finally {
      setIsConnecting(false)
    }
  }

  const handlePayEthers = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contract || !signer || !ethRecipient || !ethAmount || !network) {
      setError('Please fill in all fields and connect wallet')
      return
    }

    setIsProcessing(true)
    setIsValidatingTransaction(false)
    setError(null)
    setSuccess(null)
    setShowOnboardingMessage(false)

    try {
      // Validate address
      if (!ethers.isAddress(ethRecipient)) {
        throw new Error('Invalid recipient address')
      }

      const value = ethers.parseEther(ethAmount)
      const senderAddress = await signer.getAddress()
      
      // Validate transaction with Trustline
      setIsValidatingTransaction(true)
      try {
        const validationResponse = await trustline.validate({
          chainId: network.chainId.toString(),
          senderAddress: senderAddress,
          contractAddress: contractAddress,
          nativeAmount: value.toString(),
          data: {
            functionPrototype: 'payEthers(address)',
            args: [ethRecipient]
          }
        })

        // Check if response has an error (TrustlineErrorResponse)
        if ('error' in validationResponse) {
          setShowOnboardingMessage(true)
          throw new Error(validationResponse.error.message || 'Transaction validation failed')        }

        // Check the result status
        if ('result' in validationResponse) {
          if (validationResponse.result.status === 'rejected') {
            throw new Error(`Transaction rejected: ${validationResponse.result.reason || 'Unknown reason'}`)
          } else if (validationResponse.result.status === 'approved') {
            setSuccess('Transaction validated by Trustline ✓')
          }
        }

        setIsValidatingTransaction(false)
      } catch (validationError: any) {
        setIsValidatingTransaction(false)
        setShowOnboardingMessage(true)
        throw new Error(`Trustline validation failed: ${validationError.message || 'Unknown error'}`)      }
      
      // Execute the transaction
      const tx = await contract.payEthers(ethRecipient, { value })
      setSuccess(`Transaction sent! Hash: ${tx.hash}`)
      
      // Wait for confirmation
      await tx.wait()
      setSuccess(`Transaction confirmed! Hash: ${tx.hash}`)
      
      // Reset form
      setEthRecipient('')
      setEthAmount('')
    } catch (err: any) {
      setError(err.message || 'Transaction failed')
      console.error('Payment error:', err)
      // Reset onboarding message flag if it's not a validation error
      if (!err.message?.includes('Trustline validation failed')) {
        setShowOnboardingMessage(false)
      }
    } finally {
      setIsProcessing(false)
      setIsValidatingTransaction(false)
    }
  }


  return (
    <div className="app">
      <header className="header">
        <h1>🛡️ Authorized Payment</h1>
        <p className="subtitle">Trustline SDK Integration Example - UI for PaymentFirewall.sol contract.</p>
      </header>

      <main className="main">
        <p className="demo-note">This is a demo UI to show the Trustline auth flow for email OTP. It would work similarly with any other smart contract and smart contract method, without any additional work on UI or smart contract once Trustline sdk is integrated.</p>
        <p className="demo-note">This smart contract has only one method - payEthers - which transfers ETH from the signer to the destination address. In this example, the transfer will only be executed once the signer has been authorized.</p>
        {!account ? (
          <div className="connect-section">
            <h2>Connect Your Wallet</h2>
            <p>Connect your MetaMask wallet to interact with the Payment Firewall contract.</p>
            <button 
              onClick={connectWallet} 
              disabled={isConnecting}
              className="connect-button"
            >
              {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
            </button>
          </div>
        ) : (
          <div className="wallet-info">
            <div className="connection-details">
              <div className="account-badge">
                <span>Connected Wallet: </span>
                <code>{account}</code>
              </div>
              {network && (
                <div className="network-badge">
                  <span>Network: </span>
                  <code>{network.name} (Chain ID: {network.chainId.toString()})</code>
                </div>
              )}
            </div>
            
            <div className="contract-address-section">
              <h3>PaymentFirewall Contract Address</h3>
              <p className="section-description">Enter a deployed PaymentFirewall contract address to interact with it</p>
              <div className="contract-input-group">
                <input
                  type="text"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  onBlur={(e) => handleContractAddressChange(e.target.value)}
                  placeholder="0x..."
                  className="contract-address-input"
                  disabled={isValidatingContract}
                />
                <button
                  onClick={() => handleContractAddressChange(contractAddress)}
                  className="update-contract-button"
                  disabled={isValidatingContract}
                >
                  {isValidatingContract ? 'Validating...' : 'Validate & Update'}
                </button>
              </div>
              {isValidatingContract && (
                <div className="contract-status validating">
                  <span className="status-indicator">⏳</span>
                  <span>Validating contract...</span>
                </div>
              )}
              {contract && !isValidatingContract && (
                <div className="contract-status">
                  <span className="status-indicator">✓</span>
                  <span>PaymentFirewall contract validated and ready - Trustline policy for this contract is applied</span>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {showOnboardingMessage && (
          <div className="alert alert-warning">
            <strong>Reminder:</strong> Have you completed the onboarding procedure? Please visit{' '}
            <a href="https://onboarding.trustline.id" target="_blank" rel="noopener noreferrer" style={{ color: '#856404', textDecoration: 'underline' }}>
              https://onboarding.trustline.id
            </a>{' '}
            to complete your setup.
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <strong>Success:</strong> {success}
          </div>
        )}

        {account && contract && (
          <div className="payment-forms">
            <div className="payment-card">
              <h2>Pay Ethers - from a verified user</h2>
              <p className="card-description">Send native ETH to a recipient. This transaction triggers Trustline verification flow in line with your policy.</p>
              <form onSubmit={handlePayEthers}>
                <div className="form-group">
                  <label htmlFor="recipient-eth">Recipient Address</label>
                  <input
                    id="recipient-eth"
                    type="text"
                    value={ethRecipient}
                    onChange={(e) => setEthRecipient(e.target.value)}
                    placeholder="0x..."
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="amount-eth">Amount (ETH)</label>
                  <input
                    id="amount-eth"
                    type="text"
                    value={ethAmount}
                    onChange={(e) => setEthAmount(e.target.value)}
                    placeholder="0.1"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isProcessing || isValidatingTransaction}
                  className="submit-button"
                >
                  {isValidatingTransaction ? 'Validating with Trustline...' : isProcessing ? 'Processing...' : 'Pay Ethers (triggers Trustline validation)'}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

      <footer className="footer">
        <p>Built with ♥ using Trustline's <a href="https://www.npmjs.com/package/@trustline.id/evmsdk" target="_blank" rel="noopener noreferrer">@trustline.id/evmsdk</a> and <a href="https://www.npmjs.com/package/@trustline.id/websdk" target="_blank" rel="noopener noreferrer">@trustline.id/websdk</a> libraries</p>
      </footer>
    </div>
  )
}

export default App
