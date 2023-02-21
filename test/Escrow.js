const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Escrow', () => {

    let buyer, seller, inspector, lender
    let realEstate, escrow

    beforeEach(async () => {
        [buyer, seller, inspector, lender] = await ethers.getSigners()

        //deploy real estate
        const RealEstate = await ethers.getContractFactory('RealEstate')
        realEstate = await RealEstate.deploy()

        //MINT
        let transaction = await realEstate.connect(seller)
            .mint("https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS")        

        await transaction.wait()

        const Escrow = await  ethers.getContractFactory('Escrow')
        escrow = await Escrow.deploy(
            realEstate.address,
            seller.address,
            inspector.address,
            lender.address
        )

        //approve property
        transaction = await realEstate.connect(seller).approve(escrow.address, 1)
        await transaction.wait()

        //list property 
        transaction = await escrow.connect(seller).list(1, buyer.address, tokens(10), tokens(5))
        await transaction.wait()
    })

    describe('deployment', () => {        
        it('Returns NFT Address', async () => {
            let result = await escrow.nftAddress()        
            expect(result).to.be.equal(realEstate.address)
        })

        it('Returns seller', async () => {
            result = await escrow.seller()        
            expect(result).to.be.equal(seller.address)      
        })

        it('Returns inspector', async () => {
            result = await escrow.inspector()        
            expect(result).to.be.equal(inspector.address)  
        })

        it('Returns lender', async () => {
            result = await escrow.lender()        
            expect(result).to.be.equal(lender.address)  
        })
    })

    describe('listing', () => {        
        it('Updates as listed', async () => {
            const result = await escrow.isListed(1)
            expect(result).to.be.equal(true)    
        })

        it('Updates ownership', async () => {
            expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address)    
        })

        it('returns buyer', async () => {
            const result = await escrow.buyer(1)
            expect(result).to.be.equal(buyer.address)    
        })

        it('returns purchase price', async () => {
            const result = await escrow.purchasePrice(1)
            expect(result).to.be.equal(tokens(10))    
        })

        it('returns escrow amount', async () => {
            const result = await escrow.escrowAmount(1)
            expect(result).to.be.equal(tokens(5))    
        })

        
    })

    describe('deposits', async () => {        
        it('Updates contract balance', async () => {
            const transaction = await escrow.connect(buyer).depositEarnest(1, { value: tokens(5) })
            await transaction.wait()
            const result = await escrow.getBalance()
            expect(result).to.be.equal(tokens(5))
        })
    })


    describe('inspection', async () => {        
        it('Updates inspection status', async () => {
            const transaction = await escrow.connect(inspector).updateInspectionStatus(1, true )
            await transaction.wait()
            const result = await escrow.inspectionPassed(1)
            expect(result).to.be.equal(true)
        })
    })


    describe('approval', async () => {        
        it('Updates approval status', async () => {
            let transaction

            transaction = await escrow.connect(buyer).approveSale(1)
            await transaction.wait()
            transaction = await escrow.connect(seller).approveSale(1)
            await transaction.wait()
            transaction = await escrow.connect(lender).approveSale(1)
            await transaction.wait()
            
            
            expect(await escrow.approval(1, buyer.address)).to.be.equal(true)
            expect(await escrow.approval(1, seller.address)).to.be.equal(true)
            expect(await escrow.approval(1, lender.address)).to.be.equal(true)
        })
    })

    describe('sale', async () => {      
        
        beforeEach(async () => {
            let transaction
            transaction = await escrow.connect(buyer).depositEarnest(1, {value: tokens(5)})
            await transaction.wait()

            transaction = await escrow.connect(inspector).updateInspectionStatus(1, true)
            await transaction.wait()

            transaction = await escrow.connect(buyer).approveSale(1)
            await transaction.wait()

            transaction = await escrow.connect(seller).approveSale(1)
            await transaction.wait()

            transaction = await escrow.connect(lender).approveSale(1)
            await transaction.wait()

            await lender.sendTransaction({to: escrow.address, value: tokens(5)})

            transaction = await escrow.connect(seller).finalizeSale(1)
            await transaction.wait()


        })


        it('updates balance', async () => {
            expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address)
        })


        it('updates ownership', async () => {
            expect(await escrow.getBalance()).to.be.equal(0)
        })
    })
})
