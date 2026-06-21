module aether::aether {
    use std::option;
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    /// The type identifier for the AETHER utility coin. 
    struct AETHER has drop {}

    /// Module initializer is called once on module publish.
    /// This establishes the native utility token for the Aether Agentic IoT ecosystem.
    fun init(witness: AETHER, ctx: &mut TxContext) {
        let (treasury, metadata) = coin::create_currency(
            witness,
            9, // decimals
            b"AETHER", // symbol
            b"Aether Network Token", // name
            b"The official utility token of the Aether Agentic IoT ecosystem.", // description
            option::none(), // icon url
            ctx
        );
        
        // Freeze the currency metadata so the token properties cannot be changed
        transfer::public_freeze_object(metadata);
        
        // Transfer the TreasuryCap to the deployer so they have initial control over minting
        transfer::public_transfer(treasury, tx_context::sender(ctx));
    }
}
